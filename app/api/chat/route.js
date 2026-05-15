import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const { messages, profile, mealSummary, userId } = await req.json()

    const goalStr = { bulk: 'bulking', cut: 'cutting', maintain: 'balanced', energy: 'energy boost', gut: 'gut health' }[profile?.goal] || 'balanced'
    const tgt = profile?.tdee ? Math.max(1200, profile.tdee + ({ bulk: 300, cut: -400, maintain: 0, energy: 0, gut: 0 }[profile?.goal] || 0)) : 2000
    const today = new Date().toISOString().split('T')[0]

    // Tools Sage can use
    const tools = [
      {
        name: 'log_food',
        description: 'Log a food item to the user\'s food diary for today. Use this when the user asks to log, track, or add a food item.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Food name' },
            portion: { type: 'string', description: 'Portion size e.g. "1 serving", "200g"' },
            calories: { type: 'number', description: 'Estimated calories' },
            protein: { type: 'number', description: 'Protein in grams' },
            carbs: { type: 'number', description: 'Carbs in grams' },
            fat: { type: 'number', description: 'Fat in grams' },
            meal_time: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Meal time' }
          },
          required: ['name', 'calories']
        }
      },
      {
        name: 'log_activity',
        description: 'Log a physical activity for today. Use when user asks to log exercise or activity.',
        input_schema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Activity name e.g. "Running"' },
            duration: { type: 'number', description: 'Duration in minutes' },
            burned: { type: 'number', description: 'Estimated calories burned' },
            type: { type: 'string', description: 'Activity type e.g. "running", "cycling"' }
          },
          required: ['label', 'duration', 'burned']
        }
      },
      {
        name: 'log_water',
        description: 'Log water intake for today.',
        input_schema: {
          type: 'object',
          properties: {
            amount_ml: { type: 'number', description: 'Amount in millilitres' }
          },
          required: ['amount_ml']
        }
      }
    ]

    const system = `You are Sage, a friendly personal nutrition coach inside the Planify app.

User profile:
- Goal: ${goalStr}
- Daily target: ${tgt} kcal
- Diet: ${profile?.diet?.join(', ') || 'no restrictions'}
- Allergies: ${profile?.allergies?.join(', ') || 'none'}
- Budget: €${profile?.budget || 70}/week
${mealSummary ? `- Meal plan: ${mealSummary}` : ''}

Guidelines:
- Be warm, encouraging, concise (2-4 sentences).
- When the user asks you to LOG or TRACK something (food, exercise, water), USE THE TOOLS to actually do it.
- After using a tool, confirm what you logged in a friendly way.
- For nutrition questions, give specific actionable advice.
- Never claim to have logged something without using the tool.
- Respond in the same language the user writes in.`

    // Clean history: only send text messages, strip any tool_use/tool_result blocks
    // that were saved from previous turns — Claude rejects incomplete tool sequences
    const cleanHistory = messages
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
            : String(m.content)
      }))
      .filter(m => m.content.trim().length > 0)

    // First call to get potential tool use
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system,
      tools,
      messages: cleanHistory
    })

    let reply = ''
    const actions = []

    // Process tool calls
    for (const block of response.content) {
      if (block.type === 'tool_use' && userId) {
        const input = block.input

        if (block.name === 'log_food') {
          await supabaseAdmin.from('food_log').insert({
            user_id: userId,
            date: today,
            meal_time: input.meal_time || 'snack',
            name: input.name,
            portion: input.portion || '1 serving',
            calories: Math.round(input.calories || 0),
            protein: Math.round((input.protein || 0) * 10) / 10,
            carbs: Math.round((input.carbs || 0) * 10) / 10,
            fat: Math.round((input.fat || 0) * 10) / 10,
          })
          actions.push(`✓ Logged ${input.name} (${Math.round(input.calories)} kcal)`)
        }

        if (block.name === 'log_activity') {
          await supabaseAdmin.from('activity_log').insert({
            user_id: userId,
            logged_date: today,
            type: input.type || 'other',
            label: input.label,
            duration: input.duration,
            burned: input.burned,
          })
          actions.push(`✓ Logged ${input.label} — ${input.duration} min, ~${input.burned} kcal burned`)
        }

        if (block.name === 'log_water') {
          // Get current water log
          const { data: existing } = await supabaseAdmin
            .from('water_log')
            .select('amount')
            .eq('user_id', userId)
            .eq('logged_date', today)
            .single()

          const currentAmount = existing?.amount || 0
          const newAmount = currentAmount + input.amount_ml

          await supabaseAdmin.from('water_log').upsert({
            user_id: userId,
            logged_date: today,
            amount: newAmount,
            goal: profile?.water_goal || 2500
          }, { onConflict: 'user_id,logged_date' })
          actions.push(`✓ Logged ${input.amount_ml}ml water`)
        }
      }

      if (block.type === 'text') {
        reply += block.text
      }
    }

    // If we used tools, do a follow-up to get the confirmation message
    if (actions.length > 0 && !reply) {
      const followUp = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        system,
        messages: [
          ...cleanHistory,
          { role: 'user', content: `You just completed: ${actions.join(', ')}. Confirm briefly and naturally.` }
        ]
      })
      reply = followUp.content.find(b => b.type === 'text')?.text || actions.join('\n')
    }

    if (!reply) reply = 'I\'m having trouble right now. Please try again.'

    return Response.json({ reply, actions })
  } catch (e) {
    console.error('Chat error:', e)
    const msg = e?.message || String(e)
    return Response.json({
      reply: `Error: ${msg}`,
      actions: []
    }, { status: 500 })
  }
}
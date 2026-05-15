import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()

export const maxDuration = 60

export async function POST(req) {
  try {
    const { messages, profile, mealSummary, userId, authToken } = await req.json()

    // Use service role key if available (bypasses RLS), otherwise use auth token
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${authToken}` } }
        })

    const goalStr = { bulk: 'bulking', cut: 'cutting', maintain: 'balanced', energy: 'energy boost', gut: 'gut health' }[profile?.goal] || 'balanced'
    const tgt = profile?.tdee ? Math.max(1200, profile.tdee + ({ bulk: 300, cut: -400, maintain: 0, energy: 0, gut: 0 }[profile?.goal] || 0)) : 2000
    const today = new Date().toISOString().split('T')[0]

    const tools = [
      {
        name: 'log_food',
        description: 'Log a food item to the user food diary for today. Use when user asks to log, track, or add food.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Food name e.g. "Big Mac"' },
            portion: { type: 'string', description: 'Portion size e.g. "1 burger", "200g"' },
            calories: { type: 'number', description: 'Estimated calories' },
            protein: { type: 'number', description: 'Protein in grams' },
            carbs: { type: 'number', description: 'Carbs in grams' },
            fat: { type: 'number', description: 'Fat in grams' },
            meal_time: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] }
          },
          required: ['name', 'calories', 'meal_time']
        }
      },
      {
        name: 'log_activity',
        description: 'Log physical activity for today.',
        input_schema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Activity name e.g. "Running"' },
            duration: { type: 'number', description: 'Duration in minutes' },
            burned: { type: 'number', description: 'Calories burned' },
            type: { type: 'string', description: 'Type e.g. "running"' }
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
            amount_ml: { type: 'number', description: 'Amount in ml e.g. 250' }
          },
          required: ['amount_ml']
        }
      }
    ]

    const system = `You are Sage, a friendly personal nutrition coach in the Planify app.

User: ${profile?.username || 'there'} | Goal: ${goalStr} | Target: ${tgt} kcal/day
Diet: ${profile?.diet?.join(', ') || 'no restrictions'} | Allergies: ${profile?.allergies?.join(', ') || 'none'}
${mealSummary ? `Meal plan: ${mealSummary}` : ''}

Rules:
- Be warm, concise (2-3 sentences max).
- When user asks to LOG something, ALWAYS use the tool. Never just say you logged it.
- After tool use, confirm what was logged with the actual numbers.
- Give specific nutrition advice based on their actual targets.
- Respond in the same language the user writes in.`

    const cleanHistory = messages
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
            : String(m.content || '')
      }))
      .filter(m => m.content.trim())

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system,
      tools,
      messages: cleanHistory
    })

    let reply = ''
    const actions = []
    let toolsUsed = false

    for (const block of response.content) {
      if (block.type === 'text') {
        reply += block.text
      }

      if (block.type === 'tool_use' && userId) {
        toolsUsed = true
        const input = block.input

        try {
          if (block.name === 'log_food') {
            const { error } = await supabase.from('food_log').insert({
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
            if (error) {
              console.error('food_log insert error:', error)
              actions.push(`⚠ Failed to log ${input.name}: ${error.message}`)
            } else {
              actions.push(`food`)
            }
          }

          if (block.name === 'log_activity') {
            const { error } = await supabase.from('activity_log').insert({
              user_id: userId,
              logged_date: today,
              type: input.type || 'other',
              label: input.label,
              duration: input.duration,
              burned: Math.round(input.burned || 0),
            })
            if (error) {
              console.error('activity_log insert error:', error)
              actions.push(`⚠ Failed to log activity: ${error.message}`)
            } else {
              actions.push(`activity`)
            }
          }

          if (block.name === 'log_water') {
            // Get current amount and add to it
            const { data: existing } = await supabase
              .from('water_log')
              .select('amount')
              .eq('user_id', userId)
              .eq('logged_date', today)
              .single()

            const newAmount = (existing?.amount || 0) + Math.round(input.amount_ml)

            await supabase.from('water_log').delete()
              .eq('user_id', userId).eq('logged_date', today)
            const { error } = await supabase.from('water_log').insert({
              user_id: userId,
              logged_date: today,
              amount: newAmount,
              goal: profile?.water_goal || 2500
            })
            if (error) {
              console.error('water_log insert error:', error)
            } else {
              actions.push(`water`)
            }
          }
        } catch (toolErr) {
          console.error('Tool execution error:', toolErr)
          actions.push(`error`)
        }
      }
    }

    // If tools were used but no text reply yet, generate a confirmation
    if (toolsUsed && !reply.trim()) {
      const confirmResponse = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `You are Sage, a nutrition coach. The user just asked you to log something and you did it successfully. Confirm briefly and warmly in 1-2 sentences. Be specific about what was logged.`,
        messages: [
          { role: 'user', content: cleanHistory[cleanHistory.length - 1]?.content || 'I asked you to log food' }
        ]
      })
      reply = confirmResponse.content.find(b => b.type === 'text')?.text || 'Done! I\'ve logged that for you.'
    }

    if (!reply) reply = 'Done!'

    return Response.json({ reply, actions })
  } catch (e) {
    console.error('Chat error:', e)
    return Response.json({
      reply: `Error: ${e?.message || String(e)}`,
      actions: []
    }, { status: 500 })
  }
}
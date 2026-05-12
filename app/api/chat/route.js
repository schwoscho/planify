import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { messages, profile, mealSummary } = await req.json()

    const goalStr = { bulk: 'bulking / muscle gain', cut: 'cutting / weight loss', maintain: 'balanced maintenance', energy: 'energy boost', gut: 'gut health' }[profile?.goal] || 'balanced'
    const tgt = profile?.tdee ? Math.max(1200, profile.tdee + ({ bulk: 300, cut: -400, maintain: 0, energy: 0, gut: 0 }[profile?.goal] || 0)) : 2000

    const system = `You are Sage, a friendly and knowledgeable personal nutrition coach inside the Planify app.

User profile:
- Name: ${profile?.username || 'there'}
- Goal: ${goalStr}
- Daily calorie target: ${tgt} kcal
- Diet: ${profile?.diet?.join(', ') || 'no restrictions'}
- Allergies: ${profile?.allergies?.join(', ') || 'none'}
- Weekly budget: €${profile?.budget || 70}
${mealSummary ? `- Current meal plan: ${mealSummary}` : ''}

Guidelines:
- Be warm, encouraging, and specific. Use the user's actual data when relevant.
- Keep responses concise (2-4 sentences usually). Use bullet points for lists.
- Always give actionable advice, not just general tips.
- When suggesting foods, be specific with portions and calories.
- Never diagnose medical conditions. Suggest seeing a doctor for health concerns.
- Respond in the same language the user writes in.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system,
      messages: messages.slice(-20).map((m) => ({ role: m.role, content: m.content }))
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I had trouble responding. Please try again.'

    return Response.json({ reply })
  } catch (e) {
    console.error('Chat error:', e)
    return Response.json({ reply: 'Sorry, I\'m having trouble right now. Please try again in a moment.' }, { status: 500 })
  }
}
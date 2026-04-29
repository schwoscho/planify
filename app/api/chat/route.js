import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { messages, profile, mealSummary } = await request.json()

    const goalLabels = {
      bulk: 'Bulking 💪',
      cut: 'Cutting 🔥',
      maintain: 'Balanced ⚖️',
      energy: 'Energy ⚡',
      gut: 'Gut health 🌿',
    }

    const system = `You are Planify Coach, a friendly, knowledgeable personal nutrition and fitness assistant built into the Planify app.
User profile: ${[
      profile?.diet?.length ? 'diet: ' + profile.diet.join(', ') : '',
      profile?.allergies?.length ? 'allergies: ' + profile.allergies.join(', ') : '',
      profile?.goal ? 'goal: ' + goalLabels[profile.goal] : '',
      profile?.budget ? 'budget: €' + profile.budget + '/week' : '',
    ].filter(Boolean).join('; ')}
${mealSummary ? "This week's planned meals: " + mealSummary : ''}
Keep responses concise, warm, and actionable. Use emojis sparingly. Never give medical diagnoses.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system,
      messages,
    })

    const reply = message.content.map(b => b.text || '').join('')
    return Response.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
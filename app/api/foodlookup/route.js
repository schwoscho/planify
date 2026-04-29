import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { name, portion } = await request.json()

    const prompt = `Estimate the nutritional content of: "${name}"${portion ? ' (' + portion + ')' : ' (1 typical serving)'}.
Return ONLY a JSON object: {calories: number, protein: number, carbs: number, fat: number}
All numbers are integers. No preamble, no markdown.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content.map(b => b.text || '').join('')
    const macros = JSON.parse(text.replace(/```json|```/g, '').trim())

    return Response.json({ macros })
  } catch (error) {
    console.error('Food lookup API error:', error)
    return Response.json({ error: 'Failed to look up food' }, { status: 500 })
  }
}
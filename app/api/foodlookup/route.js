import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { name, portion } = await req.json()

    const prompt = `You are a nutrition database. Return the nutritional information for this food.

Food: ${name}
Portion: ${portion || '1 serving'}

Respond ONLY with valid JSON, no markdown:
{
  "name": "food name",
  "portion": "portion description",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return Response.json(data)
  } catch (e) {
    console.error('Food lookup error:', e)
    return Response.json({ error: 'Could not look up food' }, { status: 500 })
  }
}
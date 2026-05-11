import Anthropic from '@anthropic-ai/sdk'

export async function POST(req) {
  try {
    const { imageBase64, mimeType } = await req.json()
    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 }
          },
          {
            type: 'text',
            text: `You are a nutrition expert. Identify the food in this image and estimate its nutritional content.

Respond ONLY with a valid JSON object, no markdown, no explanation, just JSON:
{
  "name": "food name (be specific, e.g. 'Scrambled eggs with toast')",
  "portion": "estimated portion (e.g. '2 eggs + 1 slice')",
  "confidence": "high/medium/low",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "notes": "brief note about the estimate or any uncertainty"
}

If you cannot identify food in the image, return:
{"error": "No food detected in this image"}`
          }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)
      return Response.json(result)
    } catch {
      return Response.json({ error: 'Could not parse nutrition data' })
    }
  } catch (e) {
    console.error('Photo log error:', e)
    return Response.json({ error: 'Failed to analyse image' }, { status: 500 })
  }
}
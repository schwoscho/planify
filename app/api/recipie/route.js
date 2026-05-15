import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export const maxDuration = 30

export async function POST(req) {
  try {
    const { mealName, ingredients, servings = 2 } = await req.json()

    const prompt = `Write a recipe for "${mealName}" (${servings} servings).
Ingredients: ${ingredients?.map(i => `${i.qty} ${i.name}`).join(', ') || 'standard ingredients'}

Return ONLY valid JSON:
{"prepTime":"10 min","cookTime":"20 min","steps":["Step 1...","Step 2...","Step 3...","Step 4...","Step 5..."],"tips":"One useful chef tip"}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return Response.json(JSON.parse(clean))
  } catch (e) {
    console.error('Recipe error:', e)
    return Response.json({ steps: ['Recipe details unavailable.'], tips: '' }, { status: 500 })
  }
}
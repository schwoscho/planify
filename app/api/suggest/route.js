import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { profile, filters, avoid, servings = 2, mealDays = 1 } = await req.json()

    const dietStr = filters.diet?.join(', ') || 'no restrictions'
    const allergyStr = filters.allergies?.join(', ') || 'none'
    const goalStr = { bulk: 'muscle gain / bulking', cut: 'weight loss / cutting', maintain: 'balanced / maintenance', energy: 'energy boost', gut: 'gut health' }[profile?.goal] || 'balanced'
    const cuisineStr = filters.cuisine ? `Cuisine: ${filters.cuisine}.` : 'Any cuisine.'
    const timeStr = filters.time ? `Cook time: ${filters.time === 'quick' ? 'under 30 minutes' : filters.time === 'medium' ? '30-60 minutes' : '60+ minutes'}.` : ''
    const diffStr = filters.difficulty ? `Difficulty: ${filters.difficulty}.` : ''
    const avoidStr = avoid ? `Avoid: ${avoid}.` : ''
    const servingsStr = servings > 1 ? `Scaled for ${servings} people.` : ''
    const daysStr = mealDays > 1 ? `This meal will be repeated for ${mealDays} days.` : ''
    const targetCals = profile?.tdee || 2000
    const budget = filters.budget ? `Weekly budget: €${filters.budget}.` : ''

    const prompt = `You are a professional nutritionist and chef. Suggest 3 varied meal options.

User profile:
- Goal: ${goalStr}
- Diet: ${dietStr}
- Allergies: ${allergyStr}
- Daily calorie target: ${targetCals} kcal
- ${budget}
- ${cuisineStr} ${timeStr} ${diffStr} ${avoidStr} ${servingsStr} ${daysStr}

Respond ONLY with a valid JSON object. No markdown, no explanation, just JSON:
{
  "meals": [
    {
      "name": "meal name",
      "desc": "2-sentence description",
      "emoji": "single food emoji",
      "cuisine": "cuisine type",
      "timeTag": "e.g. 25 min",
      "diffTag": "Easy / Medium / Advanced",
      "macros": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      },
      "ingredients": [
        { "name": "ingredient", "qty": "amount with unit", "section": "Produce/Protein/Dairy/Grains/Pantry" }
      ]
    }
  ]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return Response.json(data)
  } catch (e) {
    console.error('Suggest error:', e)
    return Response.json({ meals: [] }, { status: 500 })
  }
}
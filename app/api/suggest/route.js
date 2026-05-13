import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { profile, filters, avoid, servings = 2, mealDays = 1, mealSlot = 'lunch', recentMeals = [] } = await req.json()

    const goalStr = { bulk: 'muscle gain / bulking', cut: 'weight loss / cutting', maintain: 'balanced / maintenance', energy: 'energy boost', gut: 'gut health' }[profile?.goal] || 'balanced'
    const tgt = profile?.tdee ? Math.max(1200, profile.tdee + ({ bulk: 300, cut: -400, maintain: 0, energy: 0, gut: 0 }[profile?.goal] || 0)) : 2000

    // Slot-specific guidance
    const slotGuidance = {
      breakfast: `BREAKFAST meal: Keep it SIMPLE and quick (under 20 min). Think: oats, eggs, yogurt, smoothies, toast with toppings, pancakes, granola. People do NOT eat heavy or complex meals for breakfast. Target ~${Math.round(tgt * 0.25)} kcal.`,
      lunch: `LUNCH meal: Medium complexity, balanced and filling. Think: salads, grain bowls, sandwiches, pasta, soups, stir-fries. Target ~${Math.round(tgt * 0.35)} kcal.`,
      dinner: `DINNER meal: Can be more elaborate but still practical. Think: protein + veg + carb combinations, roasted dishes, curries, grilled meats/fish. Target ~${Math.round(tgt * 0.35)} kcal.`,
    }[mealSlot] || ''

    const recentStr = recentMeals.length > 0
      ? `\nDO NOT suggest these meals (used in the last 2 weeks): ${recentMeals.join(', ')}`
      : ''

    const prompt = `You are a professional nutritionist and chef. Suggest exactly 5 varied ${mealSlot} options.

User profile:
- Goal: ${goalStr}
- Diet: ${filters.diet?.join(', ') || 'no restrictions'}
- Allergies: ${filters.allergies?.join(', ') || 'none'}
- Daily calorie target: ${tgt} kcal
- Weekly budget: €${filters.budget || 70}
- Cuisine preference: ${filters.cuisine || 'any'}
- Cook time preference: ${filters.time || 'any'}
- Difficulty: ${filters.difficulty || 'any'}
- Avoid: ${avoid || 'nothing specific'}
- Scaled for: ${servings} person(s)
${recentStr}

${slotGuidance}

IMPORTANT: Give 5 DIFFERENT meals. Each must have a complete recipe with all steps.

Respond ONLY with valid JSON:
{
  "meals": [
    {
      "name": "specific meal name",
      "desc": "appetizing 2-sentence description",
      "emoji": "single relevant food emoji",
      "cuisine": "cuisine type",
      "timeTag": "e.g. 20 min",
      "diffTag": "Easy / Medium / Advanced",
      "macros": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "recipe": {
        "prepTime": "10 min",
        "cookTime": "20 min",
        "steps": [
          "Step 1: ...",
          "Step 2: ...",
          "Step 3: ..."
        ],
        "tips": "Optional chef tip"
      },
      "ingredients": [
        { "name": "ingredient", "qty": "amount with unit", "section": "Produce/Protein/Dairy/Grains/Pantry/Spices" }
      ]
    }
  ]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
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
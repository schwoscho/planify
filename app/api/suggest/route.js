import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// Vercel: extend timeout to 60s (needed for AI response)
export const maxDuration = 60

export async function POST(req) {
  try {
    const { profile, filters, avoid, servings = 2, mealDays = 1, mealSlot = 'lunch', recentMeals = [] } = await req.json()

    const goalStr = {
      bulk: 'muscle gain',
      cut: 'weight loss',
      maintain: 'maintenance',
      energy: 'energy boost',
      gut: 'gut health'
    }[profile?.goal] || 'balanced'

    const tgt = profile?.tdee
      ? Math.max(1200, profile.tdee + ({ bulk: 300, cut: -400, maintain: 0, energy: 0, gut: 0 }[profile?.goal] || 0))
      : 2000

    const slotGuidance = {
      breakfast: `BREAKFAST: Simple, quick (under 20 min). E.g. oats, eggs, yogurt, smoothie, toast. Target ~${Math.round(tgt * 0.25)} kcal.`,
      lunch: `LUNCH: Balanced, filling. E.g. salad, grain bowl, sandwich, pasta, soup. Target ~${Math.round(tgt * 0.35)} kcal.`,
      dinner: `DINNER: More elaborate. E.g. protein + veg + carb, curry, roasted dish, grilled fish. Target ~${Math.round(tgt * 0.35)} kcal.`,
    }[mealSlot] || ''

    const recentStr = recentMeals.length > 0
      ? `Avoid (recently used): ${recentMeals.slice(0, 10).join(', ')}`
      : ''

    // Compact prompt — ask for 5 meals WITHOUT full recipe steps to keep response small
    // Recipe steps are fetched separately when user taps "Recipe"
    const prompt = `Nutritionist: suggest 5 varied ${mealSlot} options.
Diet: ${filters.diet?.join(', ') || 'any'} | Allergies: ${filters.allergies?.join(', ') || 'none'}
Goal: ${goalStr} | Target: ${tgt} kcal | Budget: €${filters.budget || 70}/week
Cuisine: ${filters.cuisine || 'any'} | Time: ${filters.time || 'any'} | Difficulty: ${filters.difficulty || 'any'}
Servings: ${servings} | Avoid: ${avoid || 'nothing'} | ${recentStr}
${slotGuidance}

Return ONLY valid JSON, no markdown:
{"meals":[{"name":"...","desc":"1 sentence","emoji":"🍽","cuisine":"...","timeTag":"25 min","diffTag":"Easy","macros":{"calories":0,"protein":0,"carbs":0,"fat":0},"ingredients":[{"name":"...","qty":"200g","section":"Produce"}]}]}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return Response.json(data)
  } catch (e) {
    console.error('Suggest error:', e)
    return Response.json({ meals: [], error: e?.message || String(e) }, { status: 500 })
  }
}
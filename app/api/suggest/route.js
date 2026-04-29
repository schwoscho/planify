import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { profile, filters, avoid } = await request.json()

    const { diet, allergies, goal, budget, recipeType, time, difficulty, prefs } = filters

    const goalPrompts = {
      bulk: 'high protein 40g+ per meal, caloric surplus ~2700 kcal/day, complex carbs',
      cut: 'caloric deficit ~1750 kcal/day, high protein 35g+, low sugar',
      maintain: 'balanced macros ~2000 kcal/day, variety, nutritious',
      energy: 'low glycaemic, iron-rich, anti-inflammatory, ~2000 kcal/day',
      gut: 'high fibre, fermented foods, probiotics, ~1900 kcal/day',
    }

    const typeGuide = {
      dinner: 'dinner meal',
      bread: 'bread, bake, or healthy cookie/treat (low sugar, nutritious)',
      smoothie: 'vitamin-packed fruit or vegetable smoothie or shake',
      snack: 'healthy snack or energy bite',
    }

    const timeStr = time ? {
      quick: 'must be ready in under 30 minutes',
      medium: 'should take 30–60 minutes',
      weekend: 'can take 60+ minutes',
    }[time] : ''

    const rtDesc = recipeType?.length
      ? recipeType.map(r => typeGuide[r] || r).join(' or ')
      : 'dinner meal'

    const prompt = `User profile: ${[
      diet?.length ? 'diet restrictions: ' + diet.join(', ') : '',
      allergies?.length ? 'allergies (NEVER include): ' + allergies.join(', ') : '',
      goal ? 'nutrition goal: ' + goalPrompts[goal] : '',
      `weekly budget: €${budget || 50}`,
    ].filter(Boolean).join('; ')}

Suggest 3 ${rtDesc} recipes.
${timeStr ? 'Time: ' + timeStr : ''}
${difficulty ? 'Difficulty: ' + difficulty : ''}
${prefs?.length ? 'Style: ' + prefs.join(', ') : ''}
${avoid ? 'Avoid: ' + avoid : ''}

Return ONLY a valid JSON array with 3 objects:
- name (string)
- desc (string, max 18 words)
- tags (array of 1-2 strings)
- timeTag: "⚡ Under 30 min" | "🕐 30–60 min" | "👨‍🍳 60+ min"
- diffTag: "😊 Easy" | "🤔 Medium" | "🎓 Advanced"
- macros: {calories, protein, carbs, fat} (numbers per 2 servings)
- ingredients: [{name, qty, section}] section: Produce|Dairy|Meat & Fish|Pantry|Frozen

Raw JSON only, no markdown.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content.map(b => b.text || '').join('')
    const meals = JSON.parse(text.replace(/```json|```/g, '').trim())

    return Response.json({ meals })
  } catch (error) {
    console.error('Suggest API error:', error)
    return Response.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
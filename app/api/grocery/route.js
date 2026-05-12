import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()
export async function POST(req) {
  try {
    const { items, country, stores } = await req.json()
    if (!items?.length) return Response.json({ items: [] })
    const storeNames = stores?.join(', ') || 'any store'
    const countryName = { HU:'Hungary',DE:'Germany',AT:'Austria',UK:'United Kingdom',FR:'France',US:'United States' }[country] || country
    const prompt = `You are a grocery expert in ${countryName}. The user shops at: ${storeNames}.
For each item, suggest the best store and estimate price in local currency.
Items:\n${items.map(i=>`- ${i.name} (${i.qty})`).join('\n')}
Respond ONLY with JSON:
{"items":[{"name":"...","qty":"...","store":"store name","estimatedPrice":"e.g. €1.20"}],"totalEstimate":"e.g. €45–55"}`
    const response = await client.messages.create({ model:'claude-sonnet-4-5', max_tokens:1500, messages:[{role:'user',content:prompt}] })
    const text = response.content[0].type==='text' ? response.content[0].text : '{}'
    return Response.json(JSON.parse(text.replace(/```json|```/g,'').trim()))
  } catch(e) { return Response.json({ items:[], error:'Could not optimise' }, { status:500 }) }
}
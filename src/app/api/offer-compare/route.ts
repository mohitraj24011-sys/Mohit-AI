import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage } from '@/lib/plans'
import { createClient } from '@supabase/supabase-js'


const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { allowed } = await checkLimit(userId, 'market_trends')
    if (!allowed) return NextResponse.json({ error: 'Limit reached', upgradeUrl: '/pricing' }, { status: 429 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { offers, currentSalary, priorities } = await req.json()
    if (!offers?.length || offers.length < 2) return NextResponse.json({ error: 'At least 2 offers required' }, { status: 400 })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Expert compensation analyst for Indian IT professionals. Compare job offers holistically. Consider base, equity, growth, WFH, culture, long-term trajectory. Return JSON only.' },
        { role: 'user', content: `Current salary: ₹${currentSalary || 0}L\nPriorities: ${(priorities||['salary','growth','wfh']).join(', ')}\n\nOffers:\n${JSON.stringify(offers)}\n\nReturn JSON:\n{"winner":{"offer":"company name","confidence":"X%","reason":"2 sentences"},"comparison":[{"company":"...","score":0-100,"pros":["..."],"cons":["..."],"hikePercent":0,"totalCompensation":0,"growthPotential":"high/medium/low","wfhRating":0-10,"cultureScore":0-10,"fiveYearProjection":"where you'll be in 5 years"}],"negotiationAdvice":[{"company":"...","canNegotiate":true,"amount":"₹X more","script":"exact words to say"}],"mustAsk":[{"question":"...","why":"..."}],"redFlags":[{"company":"...","flag":"..."}],"verdict":"2 sentences on what you should do"}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    await incrementUsage(userId, 'market_trends')

    // Save
    await db().from('offer_comparisons').insert({
      user_id: userId,
      name:    `${offers.map((o: {company:string}) => o.company).join(' vs ')}`,
      offers,
      verdict: result.verdict,
    }).catch(() => {})

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const { data } = await db().from('offer_comparisons').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    return NextResponse.json({ comparisons: data || [] })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

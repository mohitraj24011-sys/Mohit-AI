import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    // ── PAYWALL CHECK ─────────────────────────────────────────────────────────
    const { allowed, remaining, plan } = await checkLimit(userId, 'market_trends')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'market_trends', plan },
        { status: 429 }
      )
    }

    const body = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Indian IT market intelligence expert. Give specific, data-backed salary benchmarks and hiring trend insights for 2024-2025. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Question: ${body.question||'What are the top skills in demand right now?'}\nUser skills: ${(body.skills||[]).join(', ')}\nTarget role: ${body.role||'Software Engineer'}\n\nReturn JSON:\n{"answer":"detailed data-backed answer","salaryInsights":{"current":"X-Y LPA","targetable":"A-B LPA","remote":"C-D LPA","topPayingCompanies":["co - range"]},"hotSkills":[{"skill":"...","demandScore":0-100,"salaryImpact":"+X LPA","why":"...","whereToLearn":"..."}],"marketSignals":["trend"],"actionableAdvice":["do this this week"],"hiringActivity":{"companies":["hiring now"],"roles":["most in demand"]}}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'market_trends')
    await trackEvent(userId, 'market_trends_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

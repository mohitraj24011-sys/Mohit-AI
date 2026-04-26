import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'
import { getPlatformsForTier } from '@/lib/platforms'



export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    // ── PAYWALL CHECK ─────────────────────────────────────────────────────────
    const { allowed, remaining, plan } = await checkLimit(userId, 'opportunity_scan')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'opportunity_scan', plan },
        { status: 429 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const body = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)
    const platforms = getPlatformsForTier(body.tier || 'mid')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Job search expert for Indian IT professionals. Generate optimised search queries for all platforms and surface hidden opportunities. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Skills: ${(body.skills||[]).join(', ')}\nTarget Roles: ${(body.targetRoles||[]).join(', ')}\nTier: ${body.tier}\nLocation: ${body.location||'India'}\nExperience: ${body.experienceYears||3} years\n\nReturn JSON:\n{"primaryQuery":"main keyword phrase","alternativeQueries":["3 variations"],"booleanQuery":"LinkedIn boolean search","hiddenOpportunities":[{"type":"...","description":"...","action":"...","url":"if applicable"}],"searchTips":["platform-specific tips"],"platformPriority":["platform1"],"xraySearches":[{"query":"Google X-Ray search string","why":"what unique jobs this finds"}],"weeklyRoutine":[{"day":"Monday","action":"...","platform":"...","timeMinutes":15}]}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'opportunity_scan')
    await trackEvent(userId, 'opportunity_scan_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

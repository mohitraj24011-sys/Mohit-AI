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
    const { allowed, remaining, plan } = await checkLimit(userId, 'gap_analysis')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'gap_analysis', plan },
        { status: 429 }
      )
    }

    const body = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Senior tech career coach for Indian IT professionals. Analyse skill gaps and prioritise learning with a realistic 90-day roadmap. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Current skills: ${(body.currentSkills||[]).join(', ')}\nTarget role: ${body.targetRole}\nExperience: ${body.yearsExperience} years\n\nReturn JSON:\n{"matchScore":0-100,"verdict":"one sentence","criticalGaps":["skill"],"highGaps":["skill"],"niceToHave":["skill"],"alreadyHave":["skill"],"estimatedTimeToReady":"X months","ninetyDayRoadmap":[{"week":"1-4","focus":"...","deliverable":"..."}],"priorityOrder":["first","then"],"salaryImpact":"what these gaps cost you in LPA"}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'gap_analysis')
    await trackEvent(userId, 'gap_analysis_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

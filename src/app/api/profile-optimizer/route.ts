import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'




export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    // ── PAYWALL CHECK ─────────────────────────────────────────────────────────
    const { allowed, remaining, plan } = await checkLimit(userId, 'profile_optimizer')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'profile_optimizer', plan },
        { status: 429 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { platform, profileData } = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Profile optimisation expert for job seekers. Give extremely specific, actionable fixes with before/after examples. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Platform: ${body.platform}\nTarget Role: ${body.targetRole}\nLevel: ${body.tier}\nSkills: ${(body.skills||[]).join(', ')}\nCurrent headline: ${body.headline||'not provided'}\nAbout: ${body.about?.slice(0,300)||'not provided'}\n\nReturn JSON:\n{"overallScore":0-100,"grade":"A/B/C/D/F","criticalIssues":[{"issue":"...","impact":"High/Med/Low","fix":"exact text","before":"...","after":"...","timeMinutes":5}],"sectionScores":{"headline":0-100,"about":0-100,"experience":0-100,"skills":0-100},"keywordsMissing":["kw"],"headlineSuggestion":"exact 220-char headline","aboutSuggestion":"full rewritten about","quickWins":["5-min action"],"estimatedSearchAppearanceIncrease":"X%","platformSpecificTips":["tip specific to this platform algorithm"]}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'profile_optimizer')
    await trackEvent(userId, 'profile_optimizer_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

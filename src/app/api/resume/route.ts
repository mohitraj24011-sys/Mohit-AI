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
    const { allowed, remaining, plan } = await checkLimit(userId, 'resume')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'resume', plan },
        { status: 429 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { experience, jobDescription } = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Expert resume writer for Indian IT professionals targeting 4× hike. Write ATS-optimized STAR bullets. Each bullet starts with action verb and includes quantified metric. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Experience:\n${body.experience}\n\nTarget Job:\n${body.jobDescription}\n\nReturn JSON:\n{"bullets":["• Led...","• Built..."],"summary":"2-sentence professional summary","keySkills":["skill1"],"improvementTips":["tip1"],"salaryPositioning":"what salary to target and why"}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'resume')
    await trackEvent(userId, 'resume_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

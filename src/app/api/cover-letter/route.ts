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
    const { allowed, remaining, plan } = await checkLimit(userId, 'cover_letter')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'cover_letter', plan },
        { status: 429 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const body = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Expert cover letter writer for Indian IT professionals. Write specific, compelling, non-generic cover letters. Never use clichés. Reference specific achievements. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Company: ${body.company || 'the company'}\nRole: ${body.role || 'this position'}\nTone: ${body.tone || 'professional'}\n\nResume:\n${body.resume}\n\nJob Description:\n${body.jobDesc}\n\nReturn JSON:\n{"letter":"full cover letter text","subjectLine":"email subject line if applying via email","keySellingPoints":["why you are the best fit"]}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'cover_letter')
    await trackEvent(userId, 'cover_letter_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

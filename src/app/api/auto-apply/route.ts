import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build' })

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { allowed, remaining, plan } = await checkLimit(userId, 'auto_apply')
    if (!allowed) {
      return NextResponse.json({ error: 'Daily limit reached', upgradeUrl: '/pricing' }, { status: 429 })
    }

    const { jobs, resumeText, dailyLimit = 10 } = await req.json()
    if (!jobs?.length) return NextResponse.json({ error: 'No jobs provided' }, { status: 400 })

    const mem = await getPersonalization(userId)
    const ctx = buildPersonalizedSystemPrompt(mem)
    const limitedJobs = jobs.slice(0, Math.min(dailyLimit, 30))

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Auto-apply prioritisation engine for Indian IT professionals. Score and rank jobs by fit. Generate tailored application materials. Return JSON only.${ctx}`,
        },
        {
          role: 'user',
          content: `Resume:\n${resumeText}\n\nJobs:\n${JSON.stringify(limitedJobs)}\n\nReturn JSON:\n{"applications":[{"jobId":"...","matchScore":0-100,"shouldApply":true,"reason":"one line","tailoredHeadline":"customised resume headline","tailoredSummary":"2-sentence custom summary","topBullets":["best 2 bullets"],"coverLetterOpener":"first 2 compelling sentences","subjectLine":"email subject if applying via email","applyKit":{"emailBody":"complete apply email","linkedinMessage":"DM to recruiter <300 chars","notes":"platform-specific tips"}}],"totalToApply":0,"skipped":0,"dailyStrategy":"today's approach","estimatedResponseTime":"days/weeks"}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    await incrementUsage(userId, 'auto_apply')
    await trackEvent(userId, 'auto_apply_used', { jobCount: limitedJobs.length, plan })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

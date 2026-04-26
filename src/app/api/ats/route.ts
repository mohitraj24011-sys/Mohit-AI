import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { calculateATS } from '@/lib/ats'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { allowed, remaining, plan } = await checkLimit(userId, 'ats')
    if (!allowed) return NextResponse.json({ error: 'Daily limit reached', upgradeUrl: '/pricing' }, { status: 429 })

    const { resumeText, jobDesc } = await req.json()
    if (!resumeText || !jobDesc) return NextResponse.json({ error: 'resumeText and jobDesc required' }, { status: 400 })

    const result = calculateATS(resumeText, jobDesc)
    await incrementUsage(userId, 'ats')
    await trackEvent(userId, 'ats_used', { score: result.score, plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

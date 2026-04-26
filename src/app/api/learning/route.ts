import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'
import { LEARNING_RESOURCES, HANDS_ON_PROJECTS } from '@/lib/learning-resources'



export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    // ── PAYWALL CHECK ─────────────────────────────────────────────────────────
    const { allowed, remaining, plan } = await checkLimit(userId, 'learning')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily limit reached', upgradeUrl: '/pricing', feature: 'learning', plan },
        { status: 429 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const body = await req.json()
    const mem = await getPersonalization(userId)
    const personalCtx = buildPersonalizedSystemPrompt(mem)
    const resources = (body.preferFree ? LEARNING_RESOURCES[body.skill]?.filter((r: {free:boolean}) => r.free) : LEARNING_RESOURCES[body.skill]) || []
    const allProjects = Object.values(HANDS_ON_PROJECTS).flat().filter((p: {skills:string[]}) => p.skills.some((s: string) => s.toLowerCase().includes((body.skill||'').toLowerCase())))

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Senior tech learning coach. Create personalised learning plans with exact Udemy/YouTube URLs. Return valid JSON only.${personalCtx}` },
        { role: 'user', content: `Skill: ${body.skill}\nLevel: ${body.currentLevel||'beginner'}\nTarget: ${body.targetRole}\nHrs/week: ${body.weeklyHours||10}\nFree only: ${body.preferFree}\n\nReturn JSON:\n{"weeklyPlan":[{"week":1,"focus":"...","resources":[{"title":"...","url":"EXACT URL","platform":"udemy/youtube/free","hours":2}],"practiceTask":"...","milestone":"..."}],"totalWeeks":0,"totalHours":0,"primaryResource":{"title":"...","url":"...","why":"..."},"freeAlternative":{"title":"...","url":"..."},"handsonProject":{"title":"...","description":"...","githubUrl":"...","estimatedHours":0},"interviewQuestions":["5 common questions"],"portfolioTip":"...","linkedinPostIdea":"..."}` },
      ],
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // ── TRACK USAGE ───────────────────────────────────────────────────────────
    await incrementUsage(userId, 'learning')
    await trackEvent(userId, 'learning_used', { plan })

    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

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

    const { allowed, remaining, plan } = await checkLimit(userId, 'market_trends')
    if (!allowed) return NextResponse.json({ error: 'Daily limit reached', upgradeUrl: '/pricing' }, { status: 429 })

    const { role, skills, yearsExp, location, currentSalary } = await req.json()
    const mem = await getPersonalization(userId)
    const ctx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Indian IT salary expert with deep knowledge of 2024-2025 compensation data across all levels. Give specific, accurate salary ranges for Indian market AND remote/global opportunities. Return JSON only.${ctx}`,
        },
        {
          role: 'user',
          content: `Role: ${role}\nSkills: ${(skills || []).join(', ')}\nExperience: ${yearsExp} years\nLocation: ${location || 'India'}\nCurrent salary: ${currentSalary ? '₹' + currentSalary + 'L' : 'Not disclosed'}\n\nReturn JSON:\n{"currentMarket":{"min":0,"max":0,"median":0,"currency":"INR","unit":"LPA"},"targetable":{"min":0,"max":0,"median":0,"notes":"how to reach this"},"remote":{"min":0,"max":0,"currency":"USD","unit":"annual","note":"for remote-first companies"},"topPaying":[{"company":"...","range":"₹X–YL","notes":"..."}],"negotiationTips":["..."],"skillsForHike":[{"skill":"...","impact":"+X LPA","timeToLearn":"..."}],"marketDemand":"high/medium/low","verdict":"one sentence on your market position","actionPlan":"what to do in next 90 days to maximize salary"}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    await incrementUsage(userId, 'market_trends')
    await trackEvent(userId, 'salary_check_used', { role, plan })
    return NextResponse.json({ ...JSON.parse(completion.choices[0].message.content || '{}'), _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

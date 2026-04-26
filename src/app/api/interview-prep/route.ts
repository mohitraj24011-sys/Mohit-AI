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

    const { allowed, remaining, plan } = await checkLimit(userId, 'interview_prep')
    if (!allowed) return NextResponse.json({ error: 'Daily limit reached', upgradeUrl: '/pricing' }, { status: 429 })

    const { action, company, role, tier, skills, answer, question } = await req.json()
    const mem = await getPersonalization(userId)
    const ctx = buildPersonalizedSystemPrompt(mem)

    if (action === 'generate_questions') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Technical interview expert for top Indian and global companies. Generate realistic company-specific questions. Return JSON only.${ctx}` },
          { role: 'user', content: `Company: ${company}\nRole: ${role}\nLevel: ${tier}\nSkills: ${(skills||[]).join(', ')}\n\nReturn JSON:\n{"dsa":[{"question":"...","difficulty":"Easy/Med/Hard","hint":"...","sampleAnswer":"..."}],"systemDesign":[{"question":"...","keyPoints":["..."],"sampleApproach":"..."}],"behavioural":[{"question":"...","framework":"STAR","whatTheyWantToHear":"...","sampleAnswer":"..."}],"technical":[{"question":"...","answer":"..."}],"companySpecific":[{"question":"...","context":"..."}],"salaryNegotiation":{"currentOffer":"when they give an offer","counterScript":"exact words","walkAwayScript":"if they push back"},"questionsToAsk":["5 smart questions"],"redFlags":["warning signs"]}` },
        ],
        response_format: { type: 'json_object' },
      })
      const result = JSON.parse(completion.choices[0].message.content || '{}')
      await incrementUsage(userId, 'interview_prep')
      await trackEvent(userId, 'interview_prep_used', { company, role, plan })
      return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
    }

    if (action === 'evaluate_answer') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Strict but fair interview evaluator from FAANG/top Indian startups. Return JSON only.` },
          { role: 'user', content: `Question: ${question}\nAnswer: ${answer}\nRole: ${role}\nCompany: ${company}\n\nReturn JSON:\n{"score":0-10,"verdict":"Hire/No Hire/Maybe","strengths":["..."],"weaknesses":["..."],"missedKeyPoints":["..."],"improvedAnswer":"better version","followUpQuestions":["..."],"bodyLanguageTips":["..."]}` },
        ],
        response_format: { type: 'json_object' },
      })
      return NextResponse.json(JSON.parse(completion.choices[0].message.content || '{}'))
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

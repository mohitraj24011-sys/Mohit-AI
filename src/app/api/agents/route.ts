import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const AGENTS: Record<string, string> = {
  'Networking Agent': 'LinkedIn networking expert for Indian IT. Generate: (1) connection request <300 chars, (2) follow-up for 1 week later, (3) 3 talking points. Return JSON: {"connectionRequest":"...","followUp":"...","talkingPoints":["..."]}',
  'Conversation Assistant': 'LinkedIn reply expert. Generate 3 reply variations: Warm, Professional, Curiosity-driven. Return JSON: {"replies":[{"tone":"...","message":"...","whyItWorks":"..."}]}',
  'Job Search Assistant': 'Senior career coach for Indian IT targeting 4× hike. Return JSON: {"sevenDayPlan":[{"day":1,"tasks":["..."]}],"negotiationScript":"...","targetCompanies":["..."],"weeklyTimeInvestment":"...","topMistakesToAvoid":["..."]}',
  'Resume Diagnosis': 'Expert resume reviewer. Return JSON: {"diagnosis":[{"issue":"...","fix":"...","before":"...","after":"..."}],"overallScore":0-100,"verdict":"...","atsTips":["..."]}',
  'Interview Coach': 'Technical interview coach. Return JSON: {"questions":[{"question":"...","type":"...","difficulty":"...","modelAnswer":"...","tip":"..."}],"redFlags":["..."],"topRejectionReason":"...","prepPlan":"...","practiceSchedule":"..."}',
  'Cold Email Writer': 'Cold outreach expert. Return JSON: {"emails":[{"type":"job/referral/consulting","subject":"...","body":"...","whyItWorks":"..."}],"subjectLineVariants":["..."],"followUpSequence":["..."]}',
  'Offer Negotiator': 'Salary negotiation expert for Indian IT. Return JSON: {"shouldNegotiate":true,"negotiationStrength":"strong/medium/weak","reasoning":"...","counterOfferTarget":"X LPA","negotiationScript":"...","hrPushbackResponses":[{"pushback":"...","response":"..."}],"joiningBonusTip":"...","verdict":"..."}',
  'LinkedIn Profile Optimizer': 'LinkedIn optimization expert. Return JSON: {"profileScore":0-100,"headlines":["...","...","..."],"aboutSection":"...","skillsToAdd":["..."],"skillsToRemove":["..."],"quickWins":["..."],"recruiterSearchTerms":["..."],"postingStrategy":"..."}',
  'Career Pivot Advisor': 'Career transition specialist for Indian IT. Return JSON: {"transitionDifficulty":1-10,"difficultyReason":"...","timeToTransition":"...","skillGap":["..."],"ninetyDayPlan":[{"weeks":"...","focus":"...","deliverable":"..."}],"portfolioProjects":[{"project":"...","whyItSignals":"..."}],"targetCompanies":["..."],"biggestMistake":"..."}',
  'Referral Hunter': 'Referral strategy expert for Indian IT. Return JSON: {"findingStrategy":[{"method":"...","tool":"...","searchQuery":"..."}],"warmUpSequence":[{"step":1,"action":"...","message":"...","timing":"..."}],"referralAsk":{"message":"...","referralPackage":"..."},"followUpSequence":[{"day":"...","message":"..."}],"successRate":"...","proTip":"..."}',
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { allowed, remaining, plan } = await checkLimit(userId, 'agents')
    if (!allowed) return NextResponse.json({ error: 'Daily limit reached', upgradeUrl: '/pricing' }, { status: 429 })

    const { agentName, input, goal, context } = await req.json()
    const systemPrompt = AGENTS[agentName]
    if (!systemPrompt) return NextResponse.json({ error: `Unknown agent: ${agentName}` }, { status: 400 })

    const mem = await getPersonalization(userId)
    const ctx = buildPersonalizedSystemPrompt(mem)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + ctx },
        { role: 'user', content: `Input: ${input}\nGoal: ${goal || 'Get a high-paying job'}\nContext: ${context || 'Indian IT professional targeting senior role'}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
    })

    await incrementUsage(userId, 'agents')
    await trackEvent(userId, 'agent_used', { agentName, plan })
    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

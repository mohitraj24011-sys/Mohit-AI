import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { checkLimit, incrementUsage, trackEvent } from '@/lib/plans'
import { ROLE_TIERS } from '@/lib/role-tiers'
import { getPersonalization, buildPersonalizedSystemPrompt } from '@/lib/personalization'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build' })

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { allowed, remaining, plan } = await checkLimit(userId, 'linkedin_extender')
    if (!allowed) return NextResponse.json({ error: 'Daily limit reached', upgradeUrl: '/pricing' }, { status: 429 })

    const { action, targetPerson, myProfile, conversationHistory, tier, replyText } = await req.json()
    const tierData = ROLE_TIERS[(tier as keyof typeof ROLE_TIERS)] || ROLE_TIERS.mid
    const mem = await getPersonalization(userId)
    const ctx = buildPersonalizedSystemPrompt(mem)

    let prompt = ''
    if (action === 'generate_connection_request') {
      prompt = `Target: ${JSON.stringify(targetPerson)}\nMy Profile: ${JSON.stringify(myProfile)}\nPitch Style: ${tierData.pitchStyle}\n\nReturn JSON:\n{"connectionRequest":"<300 chars, warm and specific","followUp7Days":"follow up after accept <500 chars","followUp14Days":"2nd follow up <400 chars","referralAsk":"message for referral after 2+ exchanges","icebreakers":["3 convo starters"],"probability":"acceptance % estimate","bestTimeToSend":"day and time"}`
    } else if (action === 'continue_conversation') {
      const history = (conversationHistory||[]).map((m: {sender:string;text:string}) => `${m.sender}: ${m.text}`).join('\n')
      prompt = `Target: ${JSON.stringify(targetPerson)}\nConversation:\n${history}\n\nReturn JSON:\n{"reply":"next message","toneAnalysis":"...","nextStep":"aim for...","redFlags":"...","alternativeReplies":["shorter","more direct"]}`
    } else if (action === 'analyze_reply') {
      prompt = `Reply from ${targetPerson?.name} at ${targetPerson?.company}: "${replyText}"\nMy role: ${myProfile?.role}\n\nReturn JSON:\n{"sentiment":"positive|neutral|negative|interested|not_interested","stage":"warming|referral_ready|too_early|rejected","summary":"one sentence","nextMessage":"exact message to send","timing":"now|3days|1week","referralPitch":"full ask if ready, null otherwise","successProbability":"60% - why"}`
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `LinkedIn networking expert for ${tierData.label} professionals. Generate human, personalised messages. Return JSON only.${ctx}` },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    await incrementUsage(userId, 'linkedin_extender')
    await trackEvent(userId, 'linkedin_msg_generated', { action, plan })
    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return NextResponse.json({ ...result, _meta: { remaining: remaining - 1, plan } })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

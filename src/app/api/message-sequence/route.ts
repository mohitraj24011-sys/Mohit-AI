import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { MESSAGE_TEMPLATES, CHANNEL_PRIORITY, LeadType } from '@/lib/marketingEngine'
import { trackEvent } from '@/lib/plans'



export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const body = await req.json()
    const { leadType, context, myProfile, targetCount } = body
    const channels   = CHANNEL_PRIORITY[leadType as LeadType]
    const templates  = MESSAGE_TEMPLATES[leadType as LeadType]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Expert sales sequence strategist for Indian market. Design multi-touch, multi-channel outreach sequences that feel human. Return JSON only.`,
        },
        {
          role: 'user',
          content: `Design a complete outreach sequence for:
Lead type: ${leadType}
Channels: ${channels.join(', ')}
My company: ${JSON.stringify(myProfile || {})}
Templates available: ${JSON.stringify(templates)}
Target: convert ${targetCount || 2} out of every 20 contacts

Return JSON:
{
  "sequenceName": "...",
  "totalSteps": 4,
  "estimatedConversionRate": "X%",
  "steps": [
    {
      "stepNumber": 1,
      "dayOffset": 0,
      "channel": "linkedin",
      "messageType": "connection_request",
      "template": "exact message with {name} {company} placeholders",
      "characterCount": 0,
      "goal": "get connection accepted",
      "ifNoResponse": "move to step 2 after 3 days",
      "ifResponse": "analyse with marketing-agent/analyse_reply",
      "toneGuide": "warm, specific, not salesy"
    }
  ],
  "variationsForABTest": [
    {"variant":"A","step":1,"template":"...","hypothesis":"..."}
  ],
  "doNotDo": ["never say this","avoid this pattern"],
  "successMetrics": {"step1AcceptRate":"X%","step2ReplyRate":"X%","overallConvRate":"X%"}
}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const sequence = JSON.parse(completion.choices[0].message.content || '{}')
    await trackEvent(userId, 'sequence_generated', { leadType })
    return NextResponse.json(sequence)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

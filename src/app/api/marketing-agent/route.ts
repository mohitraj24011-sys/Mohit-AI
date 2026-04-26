import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { trackEvent } from '@/lib/plans'
import { createClient } from '@supabase/supabase-js'
import {
  PROSPECT_SOURCES, MESSAGE_TEMPLATES, scoreLead,
  WEEKLY_OUTREACH_PLAN, CHANNEL_PRIORITY, LeadType
} from '@/lib/marketingEngine'


const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// POST /api/marketing-agent
// action: generate_message | score_lead | build_campaign | analyse_reply | get_strategy | batch_messages
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const body = await req.json()
    const { action } = body

    // ── GENERATE PERSONALISED MESSAGE ─────────────────────────────────────────
    if (action === 'generate_message') {
      const { lead, channel, step, myProfile } = body
      const leadType = lead.lead_type as LeadType
      const templates = MESSAGE_TEMPLATES[leadType]?.[channel]
      if (!templates) return NextResponse.json({ error: `No template for ${leadType}/${channel}` }, { status: 400 })

      const stepKey = ['connection','followUp1','followUp2','pitch'][step] || 'connection'
      const baseTemplate = templates[stepKey as keyof typeof templates] || ''

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Expert sales copywriter specialising in Indian B2B and B2C outreach. 
Write highly personalised, human-sounding messages. Never sound like a bot. 
Never use buzzwords like "synergy" or "leverage". Be direct, specific, warm.
Channel: ${channel}. Character limits: linkedin_connection=300, linkedin_dm=1000, email=500, whatsapp=200, reddit=2000.
Return JSON only.`,
          },
          {
            role: 'user',
            content: `Lead info:
Name: ${lead.name || 'there'}
Company: ${lead.company || 'your company'}
Role: ${lead.role || ''}
Industry: ${lead.industry || ''}
Location: ${lead.location || 'India'}
Lead Type: ${leadType}
Pain Points: ${(lead.pain_points || []).join(', ')}
Notes: ${lead.notes || ''}

My profile (sender):
Name: ${myProfile?.name || 'the team'}
Company: ${myProfile?.company || 'MohitJob AI'}
Offering: ${myProfile?.offering || 'AI job search platform + dev services'}

Base template to personalise: "${baseTemplate}"
Step: ${stepKey} (${step + 1} of 4)
Channel: ${channel}

Return JSON:
{
  "message": "final personalised message, channel-appropriate length",
  "subject": "email subject if channel=email, else null",
  "whyItWorks": "one sentence on the personalisation hook used",
  "alternativeVersion": "shorter/punchier alternative",
  "followUpTiming": "when to send next step",
  "toneAssessment": "warm/professional/casual rating 1-10 each"
}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      await trackEvent(userId, 'marketing_message_generated', { leadType, channel, step })
      return NextResponse.json(result)
    }

    // ── SCORE LEAD ────────────────────────────────────────────────────────────
    if (action === 'score_lead') {
      const { lead } = body
      const baseScore = scoreLead({
        hasEmail:     !!lead.email,
        hasLinkedIn:  !!lead.linkedin_url,
        companySize:  lead.company_size,
        replySignals: lead.intent_signals || [],
        leadType:     lead.lead_type as LeadType,
      })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert sales lead scorer. Analyse leads and predict conversion likelihood. Return JSON only.',
          },
          {
            role: 'user',
            content: `Lead: ${JSON.stringify(lead)}\nBase score: ${baseScore}/100\n\nReturn JSON:\n{"finalScore":0-100,"tier":"hot/warm/cold","conversionProbability":"X%","buyingSignals":["signal"],"redFlags":["flag"],"bestChannel":"linkedin/email/whatsapp","bestTime":"morning/afternoon/evening IST","nextAction":"exact action to take","estimatedRevenue":0,"timeToClose":"X days"}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const scored = JSON.parse(completion.choices[0].message.content || '{}')
      return NextResponse.json({ ...scored, baseScore })
    }

    // ── BUILD CAMPAIGN ────────────────────────────────────────────────────────
    if (action === 'build_campaign') {
      const { targetType, goal, myProfile, dailyLimit } = body
      const sources = PROSPECT_SOURCES[targetType as LeadType]
      const channels = CHANNEL_PRIORITY[targetType as LeadType]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert growth marketer for Indian SaaS and dev services. Build complete outreach campaigns. Return JSON only.',
          },
          {
            role: 'user',
            content: `Build a complete outreach campaign:
Target: ${targetType}
Goal: ${goal}
My offering: ${JSON.stringify(myProfile)}
Daily limit: ${dailyLimit || 20} contacts/day
Channels: ${channels.join(', ')}
Signal keywords: ${sources.signalKeywords.join(', ')}
Avg deal value: ₹${sources.avgDealValue}
Conversion time: ${sources.conversionTimeDays} days

Return JSON:
{
  "campaignName": "...",
  "targetPersona": {"title":"...","company":"...","painPoint":"...","buyingTrigger":"..."},
  "sequence": [
    {"step":1,"dayOffset":0,"channel":"...","type":"connection/message/email","template":"exact message with {placeholders}","goal":"...","successMetric":"..."}
  ],
  "prospectingSources": [{"source":"...","searchQuery":"...","url":"...","expectedLeads":0}],
  "qualificationQuestions": ["..."],
  "objectionHandling": [{"objection":"...","response":"..."}],
  "kpis": {"weeklyTarget":0,"expectedReplyRate":"X%","expectedConversionRate":"X%","projectedMonthlyRevenue":0},
  "weeklyPlan": [{"week":1,"focus":"...","actions":["..."],"target":0}],
  "doNotDo": ["..."]
}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const campaign = JSON.parse(completion.choices[0].message.content || '{}')

      // Save to DB
      const { data: saved } = await db().from('campaigns').insert({
        user_id:     userId,
        name:        campaign.campaignName || `${targetType} Campaign`,
        goal,
        target_type: targetType,
        channel:     channels[0] || 'linkedin',
        status:      'draft',
        sequence:    campaign.sequence || [],
        daily_limit: dailyLimit || 20,
      }).select().single()

      await trackEvent(userId, 'campaign_created', { targetType, goal })
      return NextResponse.json({ ...campaign, campaignId: saved?.id })
    }

    // ── ANALYSE REPLY ─────────────────────────────────────────────────────────
    if (action === 'analyse_reply') {
      const { reply, lead, conversationHistory } = body
      const history = (conversationHistory || []).map((m: {role:string;content:string}) => `${m.role}: ${m.content}`).join('\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert sales conversation analyst. Read reply signals and craft perfect next response. Return JSON only.',
          },
          {
            role: 'user',
            content: `Lead: ${JSON.stringify(lead)}
Conversation history:
${history}

Their latest reply: "${reply}"

Return JSON:
{
  "sentiment": "positive/neutral/negative/interested/objecting/not_interested",
  "buyingStage": "unaware/aware/considering/ready_to_buy/not_a_fit",
  "keySignals": ["what they said that matters"],
  "intent": "one sentence on what they actually want",
  "nextMessage": "exact message to send NOW",
  "nextMessageTone": "warm/direct/consultative",
  "askForMeeting": true/false,
  "meetingScript": "if askForMeeting: exact wording to ask for call",
  "proposalReady": true/false,
  "redFlags": ["anything concerning"],
  "successProbability": "X%",
  "recommendedAction": "reply_now/wait_2_days/send_proposal/close_lost/refer"
}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const analysis = JSON.parse(completion.choices[0].message.content || '{}')

      // Update lead status in DB if lead_id provided
      if (body.leadId && analysis.buyingStage) {
        const statusMap: Record<string, string> = {
          considering: 'interested',
          ready_to_buy: 'demo_scheduled',
          not_a_fit: 'closed_lost',
        }
        const newStatus = statusMap[analysis.buyingStage]
        if (newStatus) {
          await db().from('leads').update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', body.leadId).eq('user_id', userId)
        }
      }

      await trackEvent(userId, 'reply_analysed', { leadType: lead?.lead_type })
      return NextResponse.json(analysis)
    }

    // ── GET FULL STRATEGY ─────────────────────────────────────────────────────
    if (action === 'get_strategy') {
      const { myCompany, goals, currentStage } = body

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Expert growth strategist for Indian SaaS and dev service companies. Create actionable week-by-week acquisition plans. Return JSON only.',
          },
          {
            role: 'user',
            content: `Company: ${JSON.stringify(myCompany)}
Goals: ${JSON.stringify(goals)}
Current stage: ${currentStage || 'pre-revenue'}
Targets: [dev clients, enterprise clients, IT professionals, HR recruiters]

Weekly outreach plan context: ${JSON.stringify(WEEKLY_OUTREACH_PLAN)}

Return JSON:
{
  "executiveSummary": "3-sentence strategy overview",
  "priorityOrder": [{"rank":1,"target":"...","why":"...","expectedROI":"...","timeToFirstRevenue":"..."}],
  "week1Actions": [{"action":"...","channel":"...","target":0,"template":"...","expectedResult":"..."}],
  "week2Actions": [{"action":"...","channel":"...","target":0,"template":"...","expectedResult":"..."}],
  "week3Actions": [{"action":"...","channel":"...","target":0,"template":"...","expectedResult":"..."}],
  "week4Actions": [{"action":"...","channel":"...","target":0,"template":"...","expectedResult":"..."}],
  "contentCalendar": [{"week":1,"platform":"...","postIdea":"...","hook":"...","cta":"..."}],
  "kpis": {"month1":{"leads":0,"replies":0,"demos":0,"revenue":0},"month3":{"leads":0,"replies":0,"demos":0,"revenue":0}},
  "toolStack": [{"tool":"...","purpose":"...","cost":"free/paid","url":"..."}],
  "biggestMistakesToAvoid": ["..."],
  "quickWins": ["do this today for immediate results"]
}`,
          },
        ],
        response_format: { type: 'json_object' },
      })

      const strategy = JSON.parse(completion.choices[0].message.content || '{}')
      await trackEvent(userId, 'marketing_strategy_generated', {})
      return NextResponse.json(strategy)
    }

    // ── BATCH GENERATE MESSAGES ───────────────────────────────────────────────
    if (action === 'batch_messages') {
      const { leads, channel, step, myProfile } = body
      if (!leads?.length) return NextResponse.json({ error: 'leads required' }, { status: 400 })

      const results = []
      for (const lead of leads.slice(0, 20)) {
        const leadType = lead.lead_type as LeadType
        const templates = MESSAGE_TEMPLATES[leadType]?.[channel]
        const stepKey = ['connection','followUp1','followUp2','pitch'][step] || 'connection'
        const baseTemplate = templates?.[stepKey as keyof typeof templates] || ''

        // Fast personalisation using template substitution
        let msg = String(baseTemplate)
          .replace(/{name}/g, lead.name || 'there')
          .replace(/{company}/g, lead.company || 'your company')
          .replace(/{industry}/g, lead.industry || 'your industry')
          .replace(/{app_url}/g, process.env.NEXT_PUBLIC_APP_URL || 'mohitjob.ai')

        results.push({ leadId: lead.id, leadName: lead.name, message: msg, channel })
      }

      // Save to message_log
      if (results.length > 0) {
        await db().from('message_log').insert(
          results.map(r => ({
            user_id: userId, lead_id: r.leadId, channel,
            direction: 'outbound', content: r.message, status: 'generated',
          }))
        )
      }

      await trackEvent(userId, 'batch_messages_generated', { count: results.length, channel })
      return NextResponse.json({ messages: results, total: results.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

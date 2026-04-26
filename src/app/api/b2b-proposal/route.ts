import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'


const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { action, leadId, clientName, clientIndustry, requirement, myServices, timeline, budget } = await req.json()

    if (action === 'generate') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Expert B2B proposal writer for Indian dev agencies. Write proposals that convert. Professional yet warm. Include social proof hooks. Return JSON only.' },
          { role: 'user', content: `Client: ${clientName} (${clientIndustry})\nRequirement: ${requirement}\nOur services: ${myServices}\nTimeline: ${timeline}\nBudget discussed: ${budget || 'not discussed'}\n\nReturn JSON:\n{"title":"...","executiveSummary":"3 sentences","problemStatement":"their pain in 2 sentences","ourSolution":"how we specifically solve it","deliverables":[{"item":"...","description":"...","timeline":"X weeks"}],"timeline":{"totalWeeks":0,"phases":[{"phase":"...","duration":"2 weeks","milestones":["..."]}]},"investment":{"setup":0,"monthly":0,"oneTime":0,"currency":"INR","paymentTerms":"..."},"whyUs":["specific differentiator"],"caseStudy":{"client":"similar client type","outcome":"result we achieved","metric":"..."},"riskMitigation":["..."],"nextSteps":["step1","step2"],"callToAction":"exact closing sentence","expiryNote":"offer valid X days"}` },
        ],
        response_format: { type: 'json_object' },
      })

      const proposal = JSON.parse(completion.choices[0].message.content || '{}')

      const { data: saved } = await db().from('b2b_proposals').insert({
        user_id:     userId,
        lead_id:     leadId || null,
        title:       proposal.title || `Proposal for ${clientName}`,
        client_name: clientName,
        content:     proposal,
        status:      'draft',
        value_inr:   proposal.investment?.monthly || 0,
      }).select().single()

      return NextResponse.json({ ...proposal, proposalId: saved?.id })
    }

    if (action === 'list') {
      const { data } = await db().from('b2b_proposals').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      return NextResponse.json({ proposals: data || [] })
    }

    if (action === 'update_status') {
      const { proposalId, status } = await req.json()
      await db().from('b2b_proposals').update({ status }).eq('id', proposalId).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

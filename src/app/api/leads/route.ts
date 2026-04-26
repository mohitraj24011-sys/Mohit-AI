import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { scoreLead, LeadType } from '@/lib/marketingEngine'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const leadType = searchParams.get('type')
    const status   = searchParams.get('status')
    const minScore = parseInt(searchParams.get('minScore') || '0')
    const page     = parseInt(searchParams.get('page') || '0')

    let q = db().from('leads').select('*').eq('user_id', userId)
      .order('score', { ascending: false })
      .range(page * 50, page * 50 + 49)

    if (leadType) q = q.eq('lead_type', leadType)
    if (status)   q = q.eq('status', status)
    if (minScore > 0) q = q.gte('score', minScore)

    const { data, error } = await q
    if (error) throw error

    const leads = data || []
    const summary = {
      total:     leads.length,
      hot:       leads.filter(l => l.score >= 70).length,
      warm:      leads.filter(l => l.score >= 40 && l.score < 70).length,
      cold:      leads.filter(l => l.score < 40).length,
      byType:    {} as Record<string, number>,
      byStatus:  {} as Record<string, number>,
    }
    leads.forEach(l => {
      summary.byType[l.lead_type]  = (summary.byType[l.lead_type]  || 0) + 1
      summary.byStatus[l.status]   = (summary.byStatus[l.status]   || 0) + 1
    })

    return NextResponse.json({ leads, summary })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()

    // Auto-score
    const score = scoreLead({
      hasEmail:    !!body.email,
      hasLinkedIn: !!body.linkedin_url,
      companySize: body.company_size,
      leadType:    body.lead_type as LeadType,
    })

    const { data, error } = await db().from('leads').insert({
      user_id:         userId,
      name:            body.name,
      email:           body.email || null,
      phone:           body.phone || null,
      linkedin_url:    body.linkedin_url || null,
      twitter_url:     body.twitter_url || null,
      company:         body.company || null,
      company_size:    body.company_size || null,
      industry:        body.industry || null,
      location:        body.location || 'India',
      website:         body.website || null,
      lead_type:       body.lead_type,
      source:          body.source || 'manual',
      score,
      intent_signals:  body.intent_signals || [],
      estimated_value: body.estimated_value || 0,
      status:          'new',
      pain_points:     body.pain_points || [],
      notes:           body.notes || null,
      tags:            body.tags || [],
    }).select().single()

    if (error) throw error
    return NextResponse.json({ lead: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    updates.updated_at = new Date().toISOString()

    const { data, error } = await db().from('leads').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ lead: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await db().from('leads').delete().eq('id', id).eq('user_id', userId)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

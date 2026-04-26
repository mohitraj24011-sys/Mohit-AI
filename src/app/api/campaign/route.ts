import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data: campaigns, error } = await db()
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Enrich with lead counts
    const enriched = await Promise.all((campaigns || []).map(async c => {
      const { data: cl } = await db().from('campaign_leads').select('status').eq('campaign_id', c.id)
      const leads = cl || []
      return {
        ...c,
        leadCount:     leads.length,
        repliedCount:  leads.filter(l => l.status === 'replied').length,
        convertedCount:leads.filter(l => l.status === 'converted').length,
        replyRate:     leads.length > 0 ? Math.round((leads.filter(l => ['replied','converted'].includes(l.status)).length / leads.length) * 100) : 0,
      }
    }))

    return NextResponse.json({ campaigns: enriched })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await db().from('campaigns').insert({
      user_id:     userId,
      name:        body.name,
      goal:        body.goal,
      target_type: body.target_type,
      channel:     body.channel || 'linkedin',
      status:      'draft',
      sequence:    body.sequence || [],
      daily_limit: body.daily_limit || 20,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ campaign: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { id, ...updates } = await req.json()
    updates.updated_at = new Date().toISOString()

    const { data, error } = await db().from('campaigns').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ campaign: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

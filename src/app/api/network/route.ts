import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const autoOnly = searchParams.get('auto') === 'true'

    let query = db().from('network').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (autoOnly) query = query.eq('auto_managed', true)

    const { data, error } = await query
    if (error) throw error

    const contacts = data || []
    const stats = {
      total: contacts.length,
      to_connect: contacts.filter(c => c.status === 'to_connect').length,
      connected: contacts.filter(c => c.status === 'connected').length,
      replied: contacts.filter(c => c.status === 'replied').length,
      referrals: contacts.filter(c => c.status === 'referral_given').length,
    }

    return NextResponse.json({ contacts, stats })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await db().from('network').insert({
      user_id:            userId,
      name:               body.name,
      company:            body.company || null,
      role:               body.role || null,
      role_tier:          body.role_tier || null,
      linkedin_url:       body.linkedin_url || null,
      email:              body.email || null,
      status:             body.status || 'to_connect',
      connection_message: body.connection_message || null,
      notes:              body.notes || null,
      auto_managed:       body.auto_managed || false,
      last_contact:       new Date().toISOString().split('T')[0],
    }).select().single()

    if (error) throw error

    // Advance onboarding step 4 (send connections)
    const { data: msgs } = await db()
      .from('network')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['request_sent','connected','messaged','replied'])
    if ((msgs?.length || 0) >= 2) {
      await db().from('profiles').update({ onboarding_step: 4 }).eq('id', userId).lt('onboarding_step', 4)
    }

    await trackEvent(userId, 'contact_added', { status: body.status })
    return NextResponse.json({ contact: data })
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

    if (!updates.last_contact) updates.last_contact = new Date().toISOString().split('T')[0]

    const { data, error } = await db()
      .from('network')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ contact: data })
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

    const { error } = await db().from('network').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

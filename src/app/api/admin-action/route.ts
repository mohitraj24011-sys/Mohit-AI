import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await db().from('profiles').select('email').eq('id', userId).single()
  return data?.email === process.env.ADMIN_EMAIL
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!await isAdmin(userId)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { action, targetUserId, amount, reason } = await req.json()

    if (action === 'add_credits') {
      await db().rpc('increment_credits', { p_user_id: targetUserId, p_amount: amount || 5 })
      return NextResponse.json({ success: true, message: `Added ${amount || 5} credits` })
    }

    if (action === 'upgrade_pro') {
      await db().from('user_plans').upsert({
        user_id: targetUserId,
        plan: 'pro',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      return NextResponse.json({ success: true, message: 'Upgraded to Pro' })
    }

    if (action === 'downgrade_free') {
      await db().from('user_plans').update({
        plan: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('user_id', targetUserId)
      return NextResponse.json({ success: true, message: 'Downgraded to Free' })
    }

    if (action === 'reset_usage') {
      const today = new Date().toISOString().split('T')[0]
      await db().from('usage_logs').delete().eq('user_id', targetUserId).eq('date', today)
      return NextResponse.json({ success: true, message: 'Usage reset for today' })
    }

    if (action === 'complete_onboarding') {
      await db().from('profiles').update({
        onboarding_step: 5,
        onboarding_completed: true,
      }).eq('id', targetUserId)
      return NextResponse.json({ success: true, message: 'Onboarding completed' })
    }

    if (action === 'log_event') {
      await db().from('funnel_events').insert({
        user_id:    targetUserId,
        event:      reason || 'admin_action',
        properties: { by: userId, action },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

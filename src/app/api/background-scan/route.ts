import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateConnectionMessage, generateFollowUpMessage } from '@/lib/automation'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let totalFollowUps = 0
  let totalConnections = 0
  const logs: string[] = []

  try {
    const { data: users } = await db.from('profiles').select('*').eq('automation_enabled', true)
    if (!users?.length) return NextResponse.json({ message: 'No automation users' })

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    for (const user of users) {
      const tier = user.role_tier || 'mid'

      // Generate follow-ups for stale connected contacts
      const { data: stale } = await db
        .from('network')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .eq('auto_managed', true)
        .lt('last_contact', sevenDaysAgo)
        .limit(5)

      for (const c of stale || []) {
        const msg = generateFollowUpMessage(c.name, c.company || 'your company', (user.skills || []).join(', ') || 'software engineering')
        await db.from('network').update({ follow_up_message: msg, status: 'messaged', last_contact: new Date().toISOString().split('T')[0] }).eq('id', c.id)
        logs.push(`follow_up:${c.name}`)
        totalFollowUps++
      }

      // Generate connection messages for pending contacts
      const { data: pending } = await db
        .from('network')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'to_connect')
        .eq('auto_managed', true)
        .is('connection_message', null)
        .limit(user.linkedin_connect_daily_limit || 10)

      for (const c of pending || []) {
        const msg = generateConnectionMessage(c.name, c.role || 'professional', c.company || 'their company', user.current_role || 'Engineer', user.skills || [], tier)
        await db.from('network').update({ connection_message: msg }).eq('id', c.id)
        logs.push(`conn_msg:${c.name}`)
        totalConnections++
      }

      await db.from('automation_logs').insert({
        user_id: user.id,
        action: 'background_scan',
        platform: 'system',
        result: 'success',
        details: { followUps: totalFollowUps, connections: totalConnections },
      })
    }

    return NextResponse.json({ success: true, usersProcessed: users.length, totalFollowUps, totalConnections })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error', logs }, { status: 500 })
  }
}

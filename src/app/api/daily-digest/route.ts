import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    const [
      jobsRes, networkRes, queueRes, usageRes, profileRes, winsRes
    ] = await Promise.all([
      db().from('jobs').select('*').eq('user_id', userId),
      db().from('network').select('*').eq('user_id', userId),
      db().from('application_queue').select('*').eq('user_id', userId).in('status', ['pending','applied']),
      db().from('usage_logs').select('feature,count').eq('user_id', userId).eq('date', today),
      db().from('profiles').select('onboarding_step,target_roles,skills,ai_memory').eq('id', userId).single(),
      db().from('user_wins').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
    ])

    const jobs    = jobsRes.data || []
    const network = networkRes.data || []
    const queue   = queueRes.data || []

    // Jobs expiring soon (next 3 days with next_action_date)
    const expiringSoon = jobs.filter(j => {
      if (!j.next_action_date) return false
      const d = new Date(j.next_action_date)
      const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000)
      return daysLeft >= 0 && daysLeft <= 3
    }).map(j => ({ id: j.id, company: j.company, title: j.title, daysLeft: Math.ceil((new Date(j.next_action_date).getTime() - now.getTime()) / 86400000), action: j.next_action }))

    // Pending follow-ups (connected but not messaged in 7+ days)
    const pendingFollowups = network.filter(n => {
      if (!['connected','messaged'].includes(n.status)) return false
      if (!n.last_contact) return true
      return new Date(n.last_contact) < new Date(weekAgo)
    }).slice(0, 5)

    // Today's applied count
    const appliedToday = queue.filter(q => q.status === 'applied' && q.applied_at?.startsWith(today)).length

    // Pending queue
    const pendingQueue = queue.filter(q => q.status === 'pending').length

    // Usage today
    const usageToday = (usageRes.data || []).reduce((acc, u) => {
      acc[u.feature] = u.count
      return acc
    }, {} as Record<string, number>)

    // Conversion stats
    const applied    = jobs.filter(j => j.status !== 'wishlist').length
    const interviews = jobs.filter(j => ['interview','final','offer'].includes(j.status)).length
    const offers     = jobs.filter(j => j.status === 'offer').length

    // Action items for war room
    const actionItems: { priority: 'high' | 'medium' | 'low'; action: string; link: string; count?: number }[] = []

    if (pendingQueue > 0)
      actionItems.push({ priority: 'high', action: `${pendingQueue} applications queued for auto-apply`, link: '/auto-apply' })

    if (expiringSoon.length > 0)
      actionItems.push({ priority: 'high', action: `${expiringSoon.length} job deadlines in next 3 days`, link: '/tracker', count: expiringSoon.length })

    if (pendingFollowups.length > 0)
      actionItems.push({ priority: 'medium', action: `${pendingFollowups.length} contacts need follow-up (7+ days silent)`, link: '/network', count: pendingFollowups.length })

    if (applied < 5)
      actionItems.push({ priority: 'medium', action: 'Apply to at least 5 jobs today', link: '/opportunities' })

    if (network.filter(n => n.status === 'to_connect').length > 0)
      actionItems.push({ priority: 'low', action: 'Send pending connection requests', link: '/linkedin-extender' })

    if ((usageToday['resume'] || 0) === 0)
      actionItems.push({ priority: 'low', action: 'Update your resume with new achievements', link: '/resume' })

    return NextResponse.json({
      date: today,
      stats: { applied, interviews, offers, appliedToday, pendingQueue, networkSize: network.length },
      expiringSoon,
      pendingFollowups,
      actionItems,
      usageToday,
      recentWins: winsRes.data || [],
      targetRole: profileRes.data?.target_roles?.[0] || '',
      onboardingStep: profileRes.data?.onboarding_step || 1,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

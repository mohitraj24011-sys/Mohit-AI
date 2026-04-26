import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await db().from('profiles').select('email').eq('id', userId).single()
  const adminEmail = process.env.ADMIN_EMAIL || ''
  return !!adminEmail && data?.email === adminEmail
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!await isAdmin(userId)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()
    const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000).toISOString()
    const today = now.toISOString().split('T')[0]

    const [usersRes, plansRes, eventsRes, jobsRes, winsRes] = await Promise.all([
      db().from('profiles').select('id, email, created_at, role_tier, onboarding_completed, referred_by'),
      db().from('user_plans').select('user_id, plan, status, created_at'),
      db().from('funnel_events').select('event, created_at').gte('created_at', thirtyDaysAgo),
      db().from('jobs').select('status, created_at').gte('created_at', thirtyDaysAgo),
      db().from('user_wins').select('win_type, salary_before, salary_after, created_at').gte('created_at', thirtyDaysAgo),
    ])

    const users   = usersRes.data  || []
    const plans   = plansRes.data  || []
    const events  = eventsRes.data || []
    const allJobs = jobsRes.data   || []
    const wins    = winsRes.data   || []

    const proUsers    = plans.filter(p => p.plan === 'pro').length
    const freeUsers   = users.length - proUsers
    const convRate    = users.length > 0 ? Math.round((proUsers / users.length) * 100) : 0

    // New signups this week
    const newThisWeek = users.filter(u => u.created_at >= sevenDaysAgo).length
    const onboarded   = users.filter(u => u.onboarding_completed).length
    const referred    = users.filter(u => u.referred_by).length

    // Revenue estimate
    const mrr = proUsers * 499

    // Event breakdown
    const eventCounts: Record<string, number> = {}
    for (const e of events) {
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1
    }

    // Top events
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }))

    // Funnel stages from jobs
    const jobFunnel = {
      applied:   allJobs.filter(j => j.status !== 'wishlist').length,
      interview: allJobs.filter(j => ['interview','final'].includes(j.status)).length,
      offer:     allJobs.filter(j => j.status === 'offer').length,
    }

    // Daily signups last 14 days
    const signupsByDay: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0]
      signupsByDay[d] = 0
    }
    for (const u of users) {
      const d = u.created_at?.split('T')[0]
      if (d && d in signupsByDay) signupsByDay[d]++
    }
    const signupChart = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }))

    // Recent users table
    const recentUsers = users
      .sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0)
      .slice(0, 20)
      .map(u => {
        const plan = plans.find(p => p.user_id === u.id)
        return {
          id: u.id,
          email: u.email,
          plan: plan?.plan || 'free',
          tier: u.role_tier,
          onboarded: u.onboarding_completed,
          referred: !!u.referred_by,
          joinedAt: u.created_at,
        }
      })

    return NextResponse.json({
      overview: {
        totalUsers: users.length,
        proUsers,
        freeUsers,
        conversionRate: convRate,
        mrr,
        arr: mrr * 12,
        newThisWeek,
        onboarded,
        referred,
        referralConvRate: users.length > 0 ? Math.round((referred / users.length) * 100) : 0,
      },
      jobFunnel,
      wins: { total: wins.length, avgHike: wins.length > 0 ? Math.round(wins.reduce((s, w) => s + (w.salary_after || 0) - (w.salary_before || 0), 0) / wins.length) : 0 },
      topEvents,
      signupChart,
      recentUsers,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

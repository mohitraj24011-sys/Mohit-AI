import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function isAdmin(userId: string) {
  const { data } = await db().from('profiles').select('email').eq('id', userId).single()
  return data?.email === process.env.ADMIN_EMAIL
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!await isAdmin(userId)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const now       = new Date()
    const today     = now.toISOString().split('T')[0]
    const weekAgo   = new Date(now.getTime() - 7*86400000).toISOString().split('T')[0]
    const monthAgo  = new Date(now.getTime() - 30*86400000).toISOString().split('T')[0]

    const [
      usersRes, plansRes, jobsRes, queueRes, winsRes, eventsRes
    ] = await Promise.all([
      db().from('profiles').select('id, created_at, onboarding_completed, onboarding_step').order('created_at', { ascending: false }),
      db().from('user_plans').select('user_id, plan, status, created_at'),
      db().from('jobs').select('status, source, applied_date, interview_date, offer_date').gte('created_at', monthAgo),
      db().from('application_queue').select('status, applied_at, platform').gte('created_at', monthAgo),
      db().from('user_wins').select('win_type, salary_before, salary_after, created_at').gte('created_at', monthAgo),
      db().from('funnel_events').select('event, created_at').gte('created_at', weekAgo),
    ])

    const users   = usersRes.data  || []
    const plans   = plansRes.data  || []
    const jobs    = jobsRes.data   || []
    const queue   = queueRes.data  || []
    const wins    = winsRes.data   || []
    const events  = eventsRes.data || []

    // User funnel
    const totalUsers  = users.length
    const proUsers    = plans.filter(p => p.plan === 'pro').length
    const newThisWeek = users.filter(u => u.created_at >= weekAgo).length
    const onboarded   = users.filter(u => u.onboarding_completed).length
    const activatedPct= totalUsers > 0 ? Math.round((onboarded / totalUsers) * 100) : 0

    // Revenue
    const mrr = proUsers * 499
    const arr = mrr * 12

    // Application funnel (THE CORE METRIC)
    const applied    = jobs.filter(j => j.status !== 'wishlist').length + queue.filter(q => q.status === 'applied').length
    const interviews = jobs.filter(j => ['interview','final','offer'].includes(j.status)).length
    const offers     = jobs.filter(j => j.status === 'offer').length
    const interviewRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0
    const offerRate     = interviews > 0 ? Math.round((offers / interviews) * 100) : 0

    // Time to interview
    const interviewJobs = jobs.filter(j => j.interview_date && j.applied_date)
    const avgDaysToInterview = interviewJobs.length > 0
      ? Math.round(interviewJobs.reduce((s, j) => s + (new Date(j.interview_date).getTime() - new Date(j.applied_date).getTime()) / 86400000, 0) / interviewJobs.length)
      : null

    // Conversion funnel (free → pro)
    const conversionRate = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0

    // Daily signups (14 days)
    const signupChart: { date: string; count: number; cumulative: number }[] = []
    let cumulative = 0
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0]
      const count = users.filter(u => u.created_at?.startsWith(d)).length
      cumulative += count
      signupChart.push({ date: d, count, cumulative })
    }

    // Top events this week
    const eventCounts: Record<string, number> = {}
    for (const e of events) { eventCounts[e.event] = (eventCounts[e.event] || 0) + 1 }
    const topEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([event, count]) => ({ event, count }))

    // Wins
    const totalWins = wins.length
    const avgHike   = wins.filter(w => w.salary_before && w.salary_after).length > 0
      ? Math.round(wins.filter(w => w.salary_before && w.salary_after).reduce((s, w) => s + ((w.salary_after - w.salary_before) / w.salary_before) * 100, 0) / wins.filter(w => w.salary_before && w.salary_after).length)
      : 0

    // Health score (0-100: are users getting results?)
    const healthScore = Math.min(100, Math.round(
      (interviewRate >= 10 ? 30 : interviewRate >= 5 ? 20 : 10) +
      (conversionRate >= 5 ? 25 : conversionRate >= 2 ? 15 : 5) +
      (activatedPct >= 70 ? 25 : activatedPct >= 40 ? 15 : 5) +
      (newThisWeek >= 10 ? 20 : newThisWeek >= 5 ? 12 : 5)
    ))

    return NextResponse.json({
      // THE THREE METRICS THAT MATTER
      coreMetrics: {
        interviewRate,        // Most important: % applications → interviews
        conversionRate,       // % free → pro
        avgDaysToInterview,   // How fast do users get results?
      },
      // Revenue
      revenue: { mrr, arr, proUsers, freeUsers: totalUsers - proUsers },
      // Users
      users: { total: totalUsers, newThisWeek, onboarded, activatedPct, healthScore },
      // Product usage
      product: { applied, interviews, offers, offerRate, totalWins, avgHike },
      // Charts
      signupChart,
      topEvents,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

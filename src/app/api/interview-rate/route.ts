import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// The ONE metric that matters: applications → interviews
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const [jobsRes, queueRes, interviewsRes, profileRes] = await Promise.all([
      db().from('jobs').select('status, source, applied_date, interview_date, offer_amount, company').eq('user_id', userId),
      db().from('application_queue').select('status, applied_at, platform').eq('user_id', userId),
      db().from('interview_outcomes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      db().from('profiles').select('target_roles, streak_days, xp_points, level').eq('id', userId).single(),
    ])

    const jobs      = jobsRes.data || []
    const queue     = queueRes.data || []
    const outcomes  = interviewsRes.data || []

    const applied    = jobs.filter(j => j.status !== 'wishlist').length + queue.filter(q => q.status === 'applied').length
    const interviews = jobs.filter(j => ['interview','final','offer'].includes(j.status)).length + outcomes.filter(o => o.outcome !== 'ghosted').length
    const offers     = jobs.filter(j => j.status === 'offer').length

    const interviewRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0
    const offerRate     = interviews > 0 ? Math.round((offers / interviews) * 100) : 0

    // Time to first interview
    const interviewJobs = jobs.filter(j => j.interview_date && j.applied_date)
    const avgDaysToInterview = interviewJobs.length > 0
      ? Math.round(interviewJobs.reduce((s, j) => {
          return s + (new Date(j.interview_date).getTime() - new Date(j.applied_date).getTime()) / 86400000
        }, 0) / interviewJobs.length)
      : null

    // Platform effectiveness
    const platformMap: Record<string, { applied: number; interviews: number }> = {}
    for (const j of jobs) {
      const src = j.source || 'Unknown'
      if (!platformMap[src]) platformMap[src] = { applied: 0, interviews: 0 }
      if (j.status !== 'wishlist') platformMap[src].applied++
      if (['interview','final','offer'].includes(j.status)) platformMap[src].interviews++
    }
    const platformStats = Object.entries(platformMap)
      .map(([platform, s]) => ({ platform, ...s, rate: s.applied > 0 ? Math.round((s.interviews / s.applied) * 100) : 0 }))
      .sort((a, b) => b.interviews - a.interviews)

    // Progress toward getting first interview
    const milestones = [
      { label: 'First application', done: applied >= 1, value: applied, target: 1 },
      { label: '5 applications', done: applied >= 5, value: Math.min(applied, 5), target: 5 },
      { label: '20 applications', done: applied >= 20, value: Math.min(applied, 20), target: 20 },
      { label: 'First interview', done: interviews >= 1, value: interviews, target: 1 },
      { label: 'First offer', done: offers >= 1, value: offers, target: 1 },
    ]

    return NextResponse.json({
      coreMetrics: {
        applied,
        interviews,
        offers,
        interviewRate,
        offerRate,
        avgDaysToInterview,
        benchmark: { good: 15, average: 8, poor: 3 }, // % of applications becoming interviews
      },
      milestones,
      platformStats: platformStats.slice(0, 6),
      recentOutcomes: outcomes.slice(0, 5),
      profile: {
        targetRole: profileRes.data?.target_roles?.[0] || 'Not set',
        streak:     profileRes.data?.streak_days || 0,
        level:      profileRes.data?.level || 1,
        xp:         profileRes.data?.xp_points || 0,
      }
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { company, role, source, daysToGet, outcome, salaryOffered, notes } = await req.json()

    const { data, error } = await db().from('interview_outcomes').insert({
      user_id: userId, company, role, source, days_to_get: daysToGet,
      outcome: outcome || 'scheduled', salary_offered: salaryOffered || null, notes,
    }).select().single()

    if (error) throw error

    await trackEvent(userId, `interview_${outcome || 'scheduled'}`, { company, source })

    // Award achievement for first interview
    if (outcome === 'scheduled' || outcome === 'attended') {
      await db().from('achievements').insert({
        user_id: userId, achievement: 'first_interview', category: 'milestone',
        xp_earned: 500, badge_icon: '🎤', description: 'Secured your first interview',
      }).catch(() => {})
    }

    return NextResponse.json({ outcome: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

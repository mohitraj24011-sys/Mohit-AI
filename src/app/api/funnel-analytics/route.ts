import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch all user data in parallel
    const [jobsRes, networkRes, resumesRes, eventsRes, profileRes] = await Promise.all([
      db.from('jobs').select('status, applied_date, interview_date, offer_date, offer_amount, created_at').eq('user_id', userId),
      db.from('network').select('status, created_at').eq('user_id', userId),
      db.from('resumes').select('ats_score, created_at').eq('user_id', userId).order('created_at'),
      db.from('funnel_events').select('event, created_at, properties').eq('user_id', userId).order('created_at'),
      db.from('profiles').select('onboarding_step, created_at').eq('id', userId).single(),
    ])

    const jobs = jobsRes.data || []
    const network = networkRes.data || []
    const resumes = resumesRes.data || []
    const events = eventsRes.data || []
    const profile = profileRes.data

    // ── Job funnel ────────────────────────────────────────────────────────────
    const applied    = jobs.filter(j => j.status !== 'wishlist').length
    const screened   = jobs.filter(j => ['screen','interview','final','offer','rejected'].includes(j.status)).length
    const interviews = jobs.filter(j => ['interview','final','offer'].includes(j.status)).length
    const offers     = jobs.filter(j => j.status === 'offer').length
    const wishlist   = jobs.filter(j => j.status === 'wishlist').length

    // ── Time metrics ──────────────────────────────────────────────────────────
    const offerJobs = jobs.filter(j => j.offer_date && j.applied_date)
    const avgDaysToOffer = offerJobs.length > 0
      ? Math.round(offerJobs.reduce((sum, j) => {
          const days = (new Date(j.offer_date).getTime() - new Date(j.applied_date).getTime()) / 86400000
          return sum + days
        }, 0) / offerJobs.length)
      : null

    const interviewJobs = jobs.filter(j => j.interview_date && j.applied_date)
    const avgDaysToInterview = interviewJobs.length > 0
      ? Math.round(interviewJobs.reduce((sum, j) => {
          const days = (new Date(j.interview_date).getTime() - new Date(j.applied_date).getTime()) / 86400000
          return sum + days
        }, 0) / interviewJobs.length)
      : null

    // ── Conversion rates ──────────────────────────────────────────────────────
    const applicationToScreen  = applied > 0 ? Math.round((screened   / applied)    * 100) : 0
    const screenToInterview     = screened > 0 ? Math.round((interviews / screened)   * 100) : 0
    const interviewToOffer      = interviews > 0 ? Math.round((offers    / interviews) * 100) : 0
    const overallConversion     = applied > 0 ? Math.round((offers     / applied)    * 100) : 0

    // ── Network funnel ────────────────────────────────────────────────────────
    const netConnected  = network.filter(n => n.status !== 'to_connect').length
    const netMessaged   = network.filter(n => ['messaged','replied','call_scheduled','referral_asked','referral_given'].includes(n.status)).length
    const netReplied    = network.filter(n => ['replied','call_scheduled','referral_asked','referral_given'].includes(n.status)).length
    const netReferrals  = network.filter(n => ['referral_given'].includes(n.status)).length

    // ── ATS trend ─────────────────────────────────────────────────────────────
    const atsScores = resumes.map((r, i) => ({
      label: `Resume #${i + 1}`,
      score: r.ats_score || 0,
      date: r.created_at,
    }))
    const avgAts = atsScores.length > 0
      ? Math.round(atsScores.reduce((s, r) => s + r.score, 0) / atsScores.length)
      : 0

    // ── Weekly activity ───────────────────────────────────────────────────────
    const weeklyActivity: Record<string, number> = {}
    for (const e of events) {
      const week = new Date(e.created_at).toISOString().slice(0, 10)
      weeklyActivity[week] = (weeklyActivity[week] || 0) + 1
    }
    const activityChart = Object.entries(weeklyActivity)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date, count }))

    // ── Platform effectiveness ─────────────────────────────────────────────
    const platformStats: Record<string, { applied: number; interviews: number; offers: number }> = {}
    for (const j of jobs) {
      const src = j.source || 'Unknown'
      if (!platformStats[src]) platformStats[src] = { applied: 0, interviews: 0, offers: 0 }
      if (j.status !== 'wishlist') platformStats[src].applied++
      if (['interview','final','offer'].includes(j.status)) platformStats[src].interviews++
      if (j.status === 'offer') platformStats[src].offers++
    }

    return NextResponse.json({
      funnel: {
        wishlist, applied, screened, interviews, offers,
        applicationToScreen, screenToInterview, interviewToOffer, overallConversion,
      },
      timeMetrics: { avgDaysToOffer, avgDaysToInterview },
      network: { total: network.length, connected: netConnected, messaged: netMessaged, replied: netReplied, referrals: netReferrals },
      ats: { scores: atsScores, average: avgAts },
      activityChart,
      platformStats,
      onboardingStep: profile?.onboarding_step || 1,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

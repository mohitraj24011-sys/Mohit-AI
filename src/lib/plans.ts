import { createClient } from '@supabase/supabase-js'

// ── Plan limits (daily) ───────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free: {
    resume: 3, ats: 5, cover_letter: 2, agents: 3,
    gap_analysis: 2, interview_prep: 2, profile_optimizer: 3,
    opportunity_scan: 5, linkedin_extender: 5, auto_apply: 5,
    learning: 10, market_trends: 5,
  },
  pro: {
    resume: 999, ats: 999, cover_letter: 999, agents: 999,
    gap_analysis: 999, interview_prep: 999, profile_optimizer: 999,
    opportunity_scan: 999, linkedin_extender: 999, auto_apply: 999,
    learning: 999, market_trends: 999,
  },
} as const

export type Feature = keyof typeof PLAN_LIMITS.free

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getUserPlan(userId: string): Promise<{ plan: string; credits: number }> {
  const db = adminDb()
  const { data } = await db
    .from('user_plans')
    .select('plan, credits')
    .eq('user_id', userId)
    .single()
  return { plan: data?.plan || 'free', credits: data?.credits || 0 }
}

export async function checkLimit(
  userId: string,
  feature: Feature
): Promise<{ allowed: boolean; remaining: number; plan: string }> {
  const db = adminDb()
  const { plan, credits } = await getUserPlan(userId)

  if (plan === 'pro' || plan === 'enterprise') {
    return { allowed: true, remaining: 999, plan }
  }

  const limit = PLAN_LIMITS.free[feature] ?? 3
  const today = new Date().toISOString().split('T')[0]

  const { data } = await db
    .from('usage_logs')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('date', today)
    .single()

  const used = data?.count || 0

  if (used < limit) {
    return { allowed: true, remaining: limit - used, plan }
  }

  // Use credit as fallback
  if (credits > 0) {
    await db.rpc('decrement_credit', { p_user_id: userId })
    return { allowed: true, remaining: 0, plan: 'free+credit' }
  }

  return { allowed: false, remaining: 0, plan }
}

export async function incrementUsage(userId: string, feature: Feature): Promise<void> {
  const db = adminDb()
  const today = new Date().toISOString().split('T')[0]

  // Upsert with atomic increment using raw SQL via RPC would be ideal,
  // but for simplicity we use insert-or-update pattern
  const { data: existing } = await db
    .from('usage_logs')
    .select('id, count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('date', today)
    .single()

  if (existing) {
    await db
      .from('usage_logs')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id)
  } else {
    await db.from('usage_logs').insert({
      user_id: userId,
      feature,
      date: today,
      count: 1,
    })
  }
}

export async function getUsageSummary(userId: string) {
  const db = adminDb()
  const { plan, credits } = await getUserPlan(userId)
  const today = new Date().toISOString().split('T')[0]
  const isPro = plan === 'pro' || plan === 'enterprise'

  const { data } = await db
    .from('usage_logs')
    .select('feature, count')
    .eq('user_id', userId)
    .eq('date', today)

  const limits = isPro ? PLAN_LIMITS.pro : PLAN_LIMITS.free
  const usage: Record<string, { used: number; limit: number; remaining: number; pct: number }> = {}

  for (const [feature, limit] of Object.entries(limits)) {
    const row = data?.find(d => d.feature === feature)
    const used = row?.count || 0
    const remaining = Math.max(0, limit - used)
    usage[feature] = { used, limit, remaining, pct: Math.min(100, Math.round((used / limit) * 100)) }
  }

  return { plan, credits, usage, isPro }
}

export async function trackEvent(
  userId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const db = adminDb()
    await db.from('funnel_events').insert({ user_id: userId, event, properties })
  } catch { /* never throw */ }
}

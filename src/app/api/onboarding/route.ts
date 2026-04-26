import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const adminDb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { referralCode, targetRole, skills, yearsExp, currentRole, targetSalary } = await req.json()
    const db = adminDb()

    // Update profile with onboarding data
    await db.from('profiles').upsert({
      id: userId,
      current_role: currentRole,
      target_roles: targetRole ? [targetRole] : [],
      skills: Array.isArray(skills) ? skills : (skills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      years_experience: yearsExp || 0,
      desired_salary_max: targetSalary || 0,
      onboarding_step: 2,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Ensure user_plans row exists
    await db.from('user_plans').upsert({ user_id: userId, plan: 'free' }, { onConflict: 'user_id' })

    // Apply referral if provided
    if (referralCode && referralCode.length >= 6) {
      // Find referrer by code
      const { data: referrerProfile } = await db
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .single()

      if (referrerProfile && referrerProfile.id !== userId) {
        // Check not already referred
        const { data: existing } = await db
          .from('referrals')
          .select('id')
          .eq('referee_id', userId)
          .single()

        if (!existing) {
          // Record referral
          await db.from('referrals').insert({
            referrer_id: referrerProfile.id,
            referee_id: userId,
            status: 'credited',
          })

          // Give both users +5 credits
          await db.rpc('increment_credits', { p_user_id: referrerProfile.id, p_amount: 5 })
          await db.rpc('increment_credits', { p_user_id: userId, p_amount: 5 })

          // Update referring profile
          await db.from('profiles').update({ referred_by: referrerProfile.id }).eq('id', userId)

          return NextResponse.json({ success: true, referralApplied: true, creditsGiven: 5 })
        }
      }
    }

    return NextResponse.json({ success: true, referralApplied: false })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// POST — complete quick start setup
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { role, skills, yearsExp, userType } = await req.json()

    await db().from('profiles').upsert({
      id: userId,
      target_roles: role ? [role] : [],
      skills: Array.isArray(skills) ? skills : (skills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      years_experience: parseInt(yearsExp) || 3,
      user_type: userType || 'job_seeker',
      onboarding_step: 2,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    await db().from('user_plans').upsert({ user_id: userId, plan: 'free', credits: 0 }, { onConflict: 'user_id' })

    await trackEvent(userId, 'quick_start_completed', { role, userType })

    return NextResponse.json({ success: true, redirect: '/war-room' })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

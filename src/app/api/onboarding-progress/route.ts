import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const adminDb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { step } = await req.json()
    const db = adminDb()

    const { data: profile } = await db
      .from('profiles')
      .select('onboarding_step')
      .eq('id', userId)
      .single()

    // Only advance forward
    if (!profile || (profile.onboarding_step || 1) >= step) {
      return NextResponse.json({ step: profile?.onboarding_step || step })
    }

    const completed = step >= 5
    await db.from('profiles').update({
      onboarding_step: step,
      onboarding_completed: completed,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    await trackEvent(userId, 'onboarding_step_completed', { step })

    if (completed) {
      await trackEvent(userId, 'onboarding_completed', {})
    }

    return NextResponse.json({ success: true, step, completed })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { getPersonalization, updatePersonalization } from '@/lib/personalization'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const mem = await getPersonalization(userId)
    return NextResponse.json(mem)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()

    // Update both profile fields AND ai_memory
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profileUpdates: Record<string, unknown> = {}
    if (body.targetRole)     profileUpdates.target_roles     = [body.targetRole]
    if (body.skills)         profileUpdates.skills           = body.skills
    if (body.yearsExp)       profileUpdates.years_experience = body.yearsExp
    if (body.tier)           profileUpdates.role_tier        = body.tier
    if (body.salaryGoal)     profileUpdates.desired_salary_max = body.salaryGoal
    if (body.currentRole)    profileUpdates.current_role     = body.currentRole
    if (body.topCompanies)   profileUpdates.target_companies = body.topCompanies
    profileUpdates.updated_at = new Date().toISOString()

    if (Object.keys(profileUpdates).length > 1) {
      await db.from('profiles').update(profileUpdates).eq('id', userId)
    }

    await updatePersonalization(userId, body)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

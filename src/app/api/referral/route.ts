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

    const [profileRes, referralsRes, planRes] = await Promise.all([
      db.from('profiles').select('referral_code').eq('id', userId).single(),
      db.from('referrals').select('*').eq('referrer_id', userId),
      db.from('user_plans').select('credits').eq('user_id', userId).single(),
    ])

    const code = profileRes.data?.referral_code || ''
    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth?ref=${code}`

    return NextResponse.json({
      code,
      referralLink,
      totalReferrals: referralsRes.data?.length || 0,
      creditedReferrals: referralsRes.data?.filter(r => r.status === 'credited').length || 0,
      credits: planRes.data?.credits || 0,
      referrals: referralsRes.data || [],
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

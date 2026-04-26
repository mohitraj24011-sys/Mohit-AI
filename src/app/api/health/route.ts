import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const start = Date.now()
  const checks: Record<string, { ok: boolean; ms: number; error?: string }> = {}

  // Check Supabase
  try {
    const t = Date.now()
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await db.from('user_plans').select('id').limit(1)
    checks.supabase = { ok: !error, ms: Date.now() - t, error: error?.message }
  } catch (e) {
    checks.supabase = { ok: false, ms: 0, error: String(e) }
  }

  // Check OpenAI key exists
  checks.openai = {
    ok: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'),
    ms: 0,
  }

  // Check Stripe key exists
  checks.stripe = {
    ok: !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'),
    ms: 0,
  }

  const allOk = Object.values(checks).every(c => c.ok)
  const totalMs = Date.now() - start

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks, totalMs, ts: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  )
}

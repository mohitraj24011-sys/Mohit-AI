import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch user's queue status
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data: queue } = await db()
      .from('application_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const counts = { pending: 0, applied: 0, failed: 0, manual_required: 0, skipped: 0 }
    for (const item of queue || []) {
      const s = item.status as keyof typeof counts
      if (s in counts) counts[s]++
    }

    const today = new Date().toISOString().split('T')[0]
    const appliedToday = (queue || []).filter(q =>
      q.status === 'applied' && q.applied_at?.startsWith(today)
    ).length

    return NextResponse.json({ queue: queue || [], counts, appliedToday })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

// POST — add jobs to queue
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { jobs } = await req.json()
    if (!jobs?.length) return NextResponse.json({ error: 'jobs array required' }, { status: 400 })

    const items = jobs.map((j: {
      jobId?: string; jobUrl: string; platform?: string;
      title: string; company: string; matchScore?: number; applyKit?: Record<string, unknown>
    }) => ({
      user_id:      userId,
      job_id:       j.jobId || null,
      job_url:      j.jobUrl,
      platform:     j.platform || 'linkedin',
      title:        j.title,
      company:      j.company,
      match_score:  j.matchScore || 0,
      apply_kit:    j.applyKit || {},
      status:       'pending',
      scheduled_at: new Date().toISOString(),
    }))

    const { data, error } = await db().from('application_queue').insert(items).select()
    if (error) throw error

    await trackEvent(userId, 'jobs_queued', { count: items.length })

    return NextResponse.json({ queued: data?.length || 0, items: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

// DELETE — clear queue item or all
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      await db().from('application_queue').delete().eq('id', id).eq('user_id', userId)
    } else {
      await db().from('application_queue').delete().eq('user_id', userId).eq('status', 'pending')
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

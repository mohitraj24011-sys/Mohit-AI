import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = db().from('jobs').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    // Stats
    const jobs = data || []
    const stats = {
      total: jobs.length,
      wishlist: jobs.filter(j => j.status === 'wishlist').length,
      applied: jobs.filter(j => j.status === 'applied').length,
      interview: jobs.filter(j => ['interview','final'].includes(j.status)).length,
      offer: jobs.filter(j => j.status === 'offer').length,
      rejected: jobs.filter(j => j.status === 'rejected').length,
    }

    return NextResponse.json({ jobs, stats })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await db().from('jobs').insert({
      user_id:      userId,
      title:        body.title,
      company:      body.company,
      status:       body.status || 'wishlist',
      source:       body.source || 'manual',
      salary_range: body.salary_range || null,
      location:     body.location || null,
      job_url:      body.job_url || null,
      description:  body.description || null,
      notes:        body.notes || null,
      applied_date: body.status === 'applied' ? new Date().toISOString().split('T')[0] : null,
      match_score:  body.match_score || 0,
      priority:     body.priority || 'medium',
    }).select().single()

    if (error) throw error

    // Advance onboarding if first application
    if (body.status !== 'wishlist') {
      const { data: jobs } = await db().from('jobs').select('id').eq('user_id', userId).neq('status', 'wishlist')
      if ((jobs?.length || 0) >= 3) {
        await db().from('profiles').update({ onboarding_step: 3 }).eq('id', userId).lt('onboarding_step', 3)
        await trackEvent(userId, 'onboarding_step_3_jobs', {})
      }
    }

    await trackEvent(userId, 'job_added', { status: body.status })
    return NextResponse.json({ job: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Auto-set dates based on status change
    if (updates.status === 'applied' && !updates.applied_date)
      updates.applied_date = new Date().toISOString().split('T')[0]
    if (updates.status === 'interview' && !updates.interview_date)
      updates.interview_date = new Date().toISOString().split('T')[0]
    if (updates.status === 'offer' && !updates.offer_date)
      updates.offer_date = new Date().toISOString().split('T')[0]

    updates.updated_at = new Date().toISOString()

    const { data, error } = await db()
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    // Track offer + auto-trigger social post
    if (updates.status === 'offer') {
      await trackEvent(userId, 'offer_received', { company: data?.company, jobId: id })
      // Queue social post for offer
      await db()
        .from('social_post_queue')
        .insert({
          user_id:      userId,
          platform:     'linkedin',
          trigger_type: 'offer',
          content:      `Got an offer at ${data?.company || 'a top company'} — generating post...`,
          status:       'pending',
          metadata:     { company: data?.company, jobId: id, autoGenerate: true },
        })
        .catch(() => {})
    }
    // Auto-trigger interview post
    if (updates.status === 'interview') {
      await trackEvent(userId, 'interview_scheduled', { company: data?.company })
      await db()
        .from('social_post_queue')
        .insert({
          user_id:      userId,
          platform:     'linkedin',
          trigger_type: 'interview',
          content:      `Interview at ${data?.company || 'a top company'} — generating post...`,
          status:       'pending',
          metadata:     { company: data?.company, autoGenerate: true },
        })
        .catch(() => {})
    }

    return NextResponse.json({ job: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await db().from('jobs').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { trackEvent } from '@/lib/plans'


const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const TRIGGER_LABELS: Record<string, string> = {
  offer: '🏆 Job Offer', interview: '🎤 Interview Landed', applications_50: '⚡ 50 Applications',
  applications_100: '💯 100 Applications', manual: '✍️ Manual Post', win: '🎉 Career Win',
  weekly_update: '📊 Weekly Update', streak_milestone: '🔥 Streak Milestone',
}

async function generatePost(openai: OpenAI, triggerType: string, context: Record<string, unknown>, userProfile: Record<string, unknown>) {
  const role = (userProfile.target_roles as string[])?.[0] || (userProfile.current_role as string) || 'Software Engineer'
  const skills = ((userProfile.skills as string[]) || []).slice(0, 5).join(', ')

  const prompts: Record<string, string> = {
    offer: `Write a LinkedIn post for an Indian IT professional who just got a job offer.
Company: ${context.company || 'a top company'}
Role: ${role}
Salary: ₹${context.salaryBefore || 0}L → ₹${context.salaryAfter || 0}L (+${context.hikePercent || 0}%)
Days searching: ${context.daysInSearch || 'a few weeks'}
Skills: ${skills}
Extra note from user: ${context.note || 'none'}
Write: specific, honest, helpful to other job hunters. NO corporate speak. Start with the salary number. 800-1000 chars.`,

    interview: `Write a LinkedIn post for getting an interview at ${context.company || 'a dream company'}.
Role: ${role}. Days searching: ${context.daysInSearch || 'a few weeks'}. Note: ${context.note || ''}.
Write: what specifically worked to get this interview. Brief, practical. 400-600 chars.`,

    applications_50: `Write a LinkedIn post: just sent 50th automated job application.
Role: ${role}. Note: ${context.note || ''}
Write: lessons after 50 applications, what worked, data-driven insight. 600-900 chars.`,

    applications_100: `Write a LinkedIn post: 100 automated job applications milestone.
Role: ${role}. Note: ${context.note || ''}
Write: "100 applications data" format - reply rates, platforms, what actually works. 700-1000 chars.`,

    manual: `Write a LinkedIn post. Context: ${context.note || 'job search update for Indian IT professional'}
Role: ${role}. Company: ${context.company || ''}. Salary: ${context.salaryAfter ? '₹' + context.salaryAfter + 'L' : ''}.
Write: natural, specific to context, not promotional. 500-900 chars.`,

    win: `Write a LinkedIn post celebrating: ${context.note || 'career win'}.
Company: ${context.company || ''}. ${context.salaryBefore && context.salaryAfter ? `₹${context.salaryBefore}L → ₹${context.salaryAfter}L` : ''}.
Write: lead with outcome, 2-3 real lessons, 1 tip. Genuine, not performative. 600-900 chars.`,

    weekly_update: `Write a Friday weekly job search update post.
Role: ${role}. Applications this week: ${context.applicationCount || 'several'}. Note: ${context.note || ''}.
Write: weekly accountability, what tried, what worked, what's next. Transparent. 500-700 chars.`,

    streak_milestone: `Write a post about ${context.streakDays || 30}-day job search streak.
Role: ${role}. Note: ${context.note || ''}
Write: what daily consistency looks like, small actions that compound. Motivating. 400-600 chars.`,
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Expert LinkedIn ghostwriter for Indian IT professionals. 
NEVER use: "thrilled", "excited to share", "humbled", "journey", "passion", "grateful to announce".
DO: specific numbers, real lessons, honest struggles, practical tips.
Return JSON: {"linkedin":"full post","short":"<280 chars","hashtags":["#tag"],"shareUrl":"https://linkedin.com/feed/?shareActive=true&text=ENCODED_POST","headline":"one line summary"}`,
      },
      {
        role: 'user',
        content: `${prompts[triggerType] || prompts.manual}
Return JSON with linkedin, short, hashtags, headline. For shareUrl: encode the linkedin post text in the URL.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85,
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')
  if (!result.shareUrl && result.linkedin) {
    result.shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(result.linkedin)}`
  }
  return result
}

// GET — fetch user's post queue
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data: queue } = await db()
      .from('social_post_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: settings } = await db()
      .from('profiles')
      .select('linkedin_auto_post, naukri_auto_post, post_trigger_offer, post_trigger_interview, post_trigger_milestone, post_trigger_manual, naukri_username')
      .eq('id', userId)
      .single()

    const stats = {
      total:       (queue || []).length,
      posted:      (queue || []).filter(p => p.status === 'posted').length,
      pending:     (queue || []).filter(p => p.status === 'pending').length,
      oneClick:    (queue || []).filter(p => p.status === 'one_click_opened').length,
    }

    return NextResponse.json({ queue: queue || [], settings, stats, triggerLabels: TRIGGER_LABELS })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

// POST — generate + queue a post, or update settings
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const body = await req.json()
    const { action } = body

    // ── Update posting settings ─────────────────────────────────────────────
    if (action === 'update_settings') {
      const { linkedinAutoPost, naukriAutoPost, triggers, naukriUsername, safeMode, maxPerWeek } = body
      await db().from('profiles').update({
        linkedin_auto_post:        linkedinAutoPost ?? false,
        naukri_auto_post:          naukriAutoPost ?? false,
        naukri_username:           naukriUsername || null,
        post_trigger_offer:        triggers?.offer ?? true,
        post_trigger_interview:    triggers?.interview ?? true,
        post_trigger_milestone:    triggers?.milestone ?? true,
        post_trigger_manual:       triggers?.manual ?? true,
        post_safe_mode:            safeMode ?? true,
        post_max_per_week:         maxPerWeek ?? 3,
        updated_at:                new Date().toISOString(),
      }).eq('id', userId)
      return NextResponse.json({ success: true })
    }

    // ── Generate post content ───────────────────────────────────────────────
    if (action === 'generate') {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const { triggerType, context } = body
      const { data: profile } = await db().from('profiles').select('target_roles, current_role, skills').eq('id', userId).single()
      const post = await generatePost(openai, triggerType, context || {}, profile || {})
      return NextResponse.json({ post, triggerType, label: TRIGGER_LABELS[triggerType] })
    }

    // ── Save to queue ───────────────────────────────────────────────────────
    if (action === 'queue') {
      const { triggerType, content, platform, metadata } = body
      const { data } = await db().from('social_post_queue').insert({
        user_id:      userId,
        platform:     platform || 'linkedin',
        trigger_type: triggerType || 'manual',
        content,
        status:       'pending',
        metadata:     metadata || {},
      }).select().single()
      await trackEvent(userId, 'post_queued', { triggerType, platform })
      return NextResponse.json({ post: data })
    }

    // ── Mark as posted (user manually posted from one-click URL) ───────────
    if (action === 'mark_posted') {
      const { postId, postUrl } = body
      await db().from('social_post_queue').update({
        status: 'posted', posted_at: new Date().toISOString(), post_url: postUrl || null,
      }).eq('id', postId).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    // ── Delete a queued post ────────────────────────────────────────────────
    if (action === 'delete') {
      await db().from('social_post_queue').delete().eq('id', body.postId).eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

// @ts-nocheck
// worker/posters/post-scheduler.ts
// Checks all triggers every hour, generates posts, and fires them

import { createClient } from '@supabase/supabase-js'
import { generatePostContent, shouldTrigger, TriggerType, PostContext } from './post-generator'
import { postToLinkedIn, generateLinkedInShareUrl } from './linkedin-poster'
import { markNaukriActive, updateNaukriProfile } from './naukri-poster'
import { log } from '../utils'

export async function runPostScheduler(): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  log('info', '📢 Running post scheduler...')

  // Get users with auto-posting enabled
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .or('linkedin_auto_post.eq.true,naukri_auto_post.eq.true')

  if (!users?.length) {
    log('info', 'No users with auto-posting enabled')
    return
  }

  for (const user of users) {
    try {
      await processUserPosts(supabase, user)
    } catch (err) {
      log('error', `Post scheduler error for user ${user.id}`, { error: String(err) })
    }
  }
}

async function processUserPosts(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>
): Promise<void> {
  const userId = user.id as string

  // Get user's stats
  const [jobsRes, triggerLogRes, profileRes] = await Promise.all([
    supabase.from('jobs').select('status, offer_amount, company, created_at').eq('user_id', userId),
    supabase.from('social_trigger_log').select('trigger_type, fired_at').eq('user_id', userId).gte('fired_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('profiles').select('streak_days, target_roles, skills, current_role, desired_salary_max').eq('id', userId).single(),
  ])

  const jobs      = jobsRes.data || []
  const trigLog   = triggerLogRes.data || []
  const profile   = profileRes.data

  // Count total applied (from both jobs table and application_queue)
  const { data: queueData } = await supabase.from('application_queue').select('id').eq('user_id', userId).eq('status', 'applied')
  const totalApplied = jobs.filter(j => j.status !== 'wishlist').length + (queueData?.length || 0)

  const hasOffer     = jobs.some(j => j.status === 'offer')
  const hasInterview = jobs.some(j => ['interview', 'final'].includes(String(j.status)))
  const streakDays   = (user.streak_days as number) || 0

  // Build trigger log map
  const lastTriggered: Record<string, string> = {}
  for (const t of trigLog) {
    lastTriggered[t.trigger_type] = new Date(t.fired_at).toISOString().split('T')[0]
  }

  const stats = { applicationCount: totalApplied, hasOffer, hasInterview, streakDays, lastTriggered }

  // Define ALL triggers to check
  const TRIGGERS: { type: TriggerType; enabled: boolean }[] = [
    { type: 'offer',            enabled: (user.post_trigger_offer as boolean) || false },
    { type: 'interview',        enabled: (user.post_trigger_interview as boolean) || false },
    { type: 'applications_50',  enabled: (user.post_trigger_milestone as boolean) || false },
    { type: 'applications_100', enabled: (user.post_trigger_milestone as boolean) || false },
    { type: 'streak_milestone', enabled: (user.post_trigger_milestone as boolean) || false },
    { type: 'weekly_update',    enabled: (user.post_trigger_milestone as boolean) || false },
  ]

  for (const { type, enabled } of TRIGGERS) {
    if (!enabled) continue
    if (!shouldTrigger(type, stats)) continue

    log('info', `Trigger fired: ${type} for user ${userId}`)

    // Find the offer job for context
    const offerJob = jobs.find(j => j.status === 'offer')
    const interviewJob = jobs.find(j => ['interview', 'final'].includes(String(j.status)))

    const ctx: PostContext = {
      triggerType:      type,
      userRole:         (profile?.target_roles as string[])?.[0] || (user.current_role as string) || 'Software Engineer',
      company:          type === 'offer' ? String(offerJob?.company || '') : type === 'interview' ? String(interviewJob?.company || '') : '',
      salaryAfter:      type === 'offer' ? (offerJob?.offer_amount as number) || undefined : undefined,
      daysInSearch:     jobs.length > 0 ? Math.round((Date.now() - new Date(String(jobs[jobs.length - 1]?.created_at)).getTime()) / 86400000) : 0,
      applicationCount: totalApplied,
      streakDays,
      skills:           profile?.skills as string[] || [],
      interviewCompany: String(interviewJob?.company || ''),
    }

    // Generate post content
    let post
    try {
      post = await generatePostContent(ctx)
    } catch (err) {
      log('error', 'Failed to generate post content', { error: String(err) })
      continue
    }

    // Queue the post
    const queueEntry = {
      user_id:      userId,
      platform:     (user.linkedin_auto_post && user.naukri_auto_post) ? 'both' : user.linkedin_auto_post ? 'linkedin' : 'naukri',
      trigger_type: type,
      content:      post.linkedin,
      status:       'pending',
      metadata: {
        short: post.short, hashtags: post.hashtags, shareUrl: post.shareUrl,
        headline: post.headline, hook: post.emojiHook,
      },
    }

    const { data: queuedPost } = await supabase.from('social_post_queue').insert(queueEntry).select().single()

    // AUTO POST to LinkedIn — ONLY if safe mode is OFF (default is ON)
    const safeMode = (user.post_safe_mode as boolean) ?? true
    if (user.linkedin_auto_post && !safeMode && queuedPost) {
      const result = await postToLinkedIn({ content: post.linkedin, headless: true })

      await supabase.from('social_post_queue').update({
        status:    result.success ? 'posted' : 'failed',
        post_url:  result.postUrl || null,
        posted_at: result.success ? new Date().toISOString() : null,
        error:     result.error || null,
      }).eq('id', queuedPost.id)

      if (result.success) {
        log('info', `✅ LinkedIn post published: ${result.postUrl}`)
      } else {
        // Fallback to one-click URL — save it in queue so user can post manually
        await supabase.from('social_post_queue').update({
          status: 'one_click_opened',
          post_url: post.shareUrl,
        }).eq('id', queuedPost.id)
        log('warn', `LinkedIn auto-post failed, saved one-click URL: ${post.shareUrl}`)
      }
    }

    // AUTO UPDATE Naukri if enabled
    if (user.naukri_auto_post) {
      const naukriResult = await markNaukriActive(true)
      if (naukriResult.success && profile) {
        await updateNaukriProfile({
          headline: `${ctx.userRole} | ${(profile.skills as string[])?.slice(0, 3).join(' | ')} | Open to Work`,
        }, true)
      }
      log('info', `Naukri active: ${naukriResult.success}`)
    }

    // Log trigger fired
    await supabase.from('social_trigger_log').insert({
      user_id:      userId,
      trigger_type: type,
      metadata:     { applicationCount: totalApplied, company: ctx.company },
    }).catch(() => {})
  }
}

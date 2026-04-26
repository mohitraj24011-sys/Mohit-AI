// worker/index.ts
// MohitJob AI — Auto-Apply Worker
// Run separately from Next.js: node dist/index.js
// Setup: npm install && npx playwright install && npm run build

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { applyLinkedIn, applyViaEmail, ApplyJob } from './linkedin'
import { runPostScheduler } from './posters/post-scheduler'
import { humanDelay, log, getDailyApplyCount } from './utils'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_PER_RUN    = parseInt(process.env.MAX_APPLIES_PER_RUN  || '3')
const MAX_PER_DAY    = 15   // Hard safety limit
const POLL_INTERVAL  = 30000 // 30 seconds between polls

async function getRecentlyApplied(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('application_queue')
    .select('applied_at')
    .eq('user_id', userId)
    .eq('status', 'applied')
    .not('applied_at', 'is', null)
  return (data || []).map(r => r.applied_at || '')
}

async function processJob(queueItem: Record<string, unknown>): Promise<void> {
  const itemId   = String(queueItem.id)
  const userId   = String(queueItem.user_id)
  const platform = String(queueItem.platform || 'linkedin')
  const attempts = Number(queueItem.attempts || 0)

  // Mark as processing
  await supabase
    .from('application_queue')
    .update({ status: 'processing' })
    .eq('id', itemId)

  // Check daily limit
  const recentApplied = await getRecentlyApplied(userId)
  const todayCount = getDailyApplyCount(recentApplied)
  if (todayCount >= MAX_PER_DAY) {
    log('warn', `User ${userId} hit daily limit (${todayCount}/${MAX_PER_DAY}) — skipping`)
    await supabase
      .from('application_queue')
      .update({ status: 'skipped', last_error: 'Daily limit reached' })
      .eq('id', itemId)
    return
  }

  // Get user profile for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, resume_text, auto_apply_enabled, daily_apply_limit')
    .eq('id', userId)
    .single()

  if (!profile?.auto_apply_enabled) {
    log('warn', `Auto-apply disabled for user ${userId}`)
    await supabase.from('application_queue').update({ status: 'skipped', last_error: 'Auto-apply disabled' }).eq('id', itemId)
    return
  }

  // Cap at user's custom limit too
  const userLimit = Math.min(profile.daily_apply_limit || 10, MAX_PER_DAY)
  if (todayCount >= userLimit) {
    await supabase.from('application_queue').update({ status: 'skipped', last_error: 'User daily limit reached' }).eq('id', itemId)
    return
  }

  const applyJob: ApplyJob = {
    id:       itemId,
    job_url:  String(queueItem.job_url || ''),
    title:    String(queueItem.title || 'Unknown Role'),
    company:  String(queueItem.company || 'Unknown Company'),
    apply_kit: {
      ...(queueItem.apply_kit as Record<string, string> || {}),
      phone: profile.phone || '',
    },
  }

  log('info', `Processing: ${applyJob.title} at ${applyJob.company} via ${platform}`)

  let result: { success: boolean; method: string; message: string }

  try {
    if (platform === 'linkedin') {
      result = await applyLinkedIn(applyJob)
    } else if (platform === 'email') {
      result = await applyViaEmail(applyJob, '')
    } else {
      result = { success: false, method: 'failed', message: `Platform ${platform} not supported yet` }
    }
  } catch (err: unknown) {
    result = { success: false, method: 'failed', message: err instanceof Error ? err.message : String(err) }
  }

  if (result.success) {
    // Success — update queue + jobs table
    await supabase
      .from('application_queue')
      .update({ status: 'applied', applied_at: new Date().toISOString() })
      .eq('id', itemId)

    if (queueItem.job_id) {
      await supabase
        .from('jobs')
        .update({ status: 'applied', auto_applied: true, applied_date: new Date().toISOString().split('T')[0] })
        .eq('id', queueItem.job_id)
    }

    // Log success
    await supabase.from('automation_logs').insert({
      user_id: userId,
      action: 'auto_apply',
      platform,
      result: 'success',
      details: { jobTitle: applyJob.title, company: applyJob.company, method: result.method },
    })

    log('info', `✅ Applied: ${applyJob.title} at ${applyJob.company}`)
  } else {
    // Failure — retry logic
    const newAttempts = attempts + 1
    const newStatus   = result.method === 'manual_required' ? 'manual_required'
                      : result.method === 'external'       ? 'skipped'
                      : newAttempts >= 3                    ? 'failed'
                      : 'pending'

    await supabase
      .from('application_queue')
      .update({ status: newStatus, attempts: newAttempts, last_error: result.message })
      .eq('id', itemId)

    await supabase.from('automation_logs').insert({
      user_id: userId,
      action: 'auto_apply_failed',
      platform,
      result: newStatus,
      details: { jobTitle: applyJob.title, error: result.message, attempts: newAttempts },
    })

    log('warn', `Failed (${newStatus}): ${applyJob.title} — ${result.message}`)
  }
}

async function runWorker(): Promise<void> {
  log('info', '🚀 MohitJob AI Worker started')
  log('info', `Config: max ${MAX_PER_RUN} per run, ${MAX_PER_DAY} per day limit`)

  while (true) {
    try {
      // Fetch pending jobs ordered by match_score (best matches first)
      const { data: pending, error } = await supabase
        .from('application_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .lt('attempts', 3)
        .order('match_score', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(MAX_PER_RUN)

      if (error) {
        log('error', 'DB query failed', { error: error.message })
        await new Promise(r => setTimeout(r, POLL_INTERVAL))
        continue
      }

      if (!pending?.length) {
        log('info', `No pending jobs — polling again in ${POLL_INTERVAL / 1000}s`)
        await new Promise(r => setTimeout(r, POLL_INTERVAL))
        continue
      }

      log('info', `Found ${pending.length} jobs to process`)

      for (const job of pending) {
        await processJob(job as Record<string, unknown>)
        // Human-like delay between applications
        if (pending.indexOf(job) < pending.length - 1) {
          log('info', 'Waiting between applies (anti-ban delay)...')
          await humanDelay()
        }
      }
    } catch (err: unknown) {
      log('error', 'Worker loop error', { error: err instanceof Error ? err.message : String(err) })
    }

    // Run post scheduler every 60 minutes
    const now = new Date()
    if (now.getMinutes() === 0 || now.getMinutes() === 30) {
      await runPostScheduler().catch(e => log('error', 'Post scheduler error', { e: String(e) }))
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL))
  }
}

// Handle shutdown gracefully
process.on('SIGINT',  () => { log('info', 'Worker stopping...'); process.exit(0) })
process.on('SIGTERM', () => { log('info', 'Worker stopping...'); process.exit(0) })

runWorker().catch(err => { log('error', 'Fatal worker error', { error: String(err) }); process.exit(1) })

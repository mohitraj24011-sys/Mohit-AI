// worker/linkedin.ts
// LinkedIn Easy Apply automation — safe, human-like, rate-limited
// IMPORTANT: Requires saved session. Run 'npx playwright codegen https://linkedin.com'
// to capture your session to linkedin-session.json

import { chromium, Page } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'
import { randomDelay, log, isSimpleApply } from './utils'

const SESSION_FILE = path.join(__dirname, 'linkedin-session.json')

export interface ApplyJob {
  id: string
  job_url: string
  title: string
  company: string
  apply_kit: {
    tailoredHeadline?: string
    tailoredSummary?: string
    coverLetterOpener?: string
    phone?: string
    resumePath?: string
  }
}

export interface ApplyResult {
  success: boolean
  method: 'easy_apply' | 'external' | 'manual_required' | 'failed'
  message: string
  screenshot?: string
}

export async function applyLinkedIn(job: ApplyJob): Promise<ApplyResult> {
  if (!fs.existsSync(SESSION_FILE)) {
    return {
      success: false,
      method: 'failed',
      message: `Session file not found: ${SESSION_FILE}. Run: npx playwright codegen https://linkedin.com to create it.`,
    }
  }

  const headless = process.env.HEADLESS === 'true'
  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    slowMo: headless ? 0 : 50, // slow mo helps with debugging
  })

  let page: Page | null = null

  try {
    const context = await browser.newContext({
      storageState: SESSION_FILE,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })

    page = await context.newPage()

    log('info', `Navigating to job: ${job.title} at ${job.company}`, { url: job.job_url })
    await page.goto(job.job_url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await randomDelay(2000, 4000)

    // Check if redirected to login
    if (page.url().includes('login') || page.url().includes('authwall')) {
      return { success: false, method: 'failed', message: 'LinkedIn session expired. Regenerate linkedin-session.json' }
    }

    // Look for Easy Apply button
    const easyApplyBtn = await page.$('button:has-text("Easy Apply"), .jobs-apply-button:has-text("Easy Apply")')

    if (!easyApplyBtn) {
      // Check for external apply
      const externalBtn = await page.$('button:has-text("Apply"), a:has-text("Apply on company website")')
      if (externalBtn) {
        log('warn', `No Easy Apply for ${job.title} — external apply required`)
        return { success: false, method: 'external', message: 'External apply required — use apply_kit email template' }
      }
      return { success: false, method: 'manual_required', message: 'No apply button found' }
    }

    // Click Easy Apply with human-like behavior
    await randomDelay(1000, 2000)
    await easyApplyBtn.scrollIntoViewIfNeeded()
    await randomDelay(500, 1000)
    await easyApplyBtn.click()
    await randomDelay(2000, 3000)

    // Check if modal opened
    const modal = await page.$('.jobs-easy-apply-content, [data-test-modal]')
    if (!modal) {
      return { success: false, method: 'failed', message: 'Easy Apply modal did not open' }
    }

    // Check page content for multi-step detection
    const modalText = await page.textContent('.jobs-easy-apply-content') || ''
    if (!isSimpleApply(modalText)) {
      log('warn', `Multi-step form detected for ${job.title} — skipping`)
      await page.keyboard.press('Escape')
      return { success: false, method: 'manual_required', message: 'Multi-step form — manual apply required' }
    }

    // Fill phone if field exists and not pre-filled
    const phoneField = await page.$('input[id*="phone"], input[name*="phone"]')
    if (phoneField && job.apply_kit.phone) {
      const currentVal = await phoneField.inputValue()
      if (!currentVal) {
        await phoneField.click()
        await randomDelay(300, 600)
        await phoneField.fill(job.apply_kit.phone)
        await randomDelay(300, 500)
      }
    }

    // Upload resume if field exists
    const resumeInput = await page.$('input[type="file"]')
    if (resumeInput && job.apply_kit.resumePath && fs.existsSync(job.apply_kit.resumePath)) {
      await resumeInput.setInputFiles(job.apply_kit.resumePath)
      await randomDelay(1500, 2500)
    }

    // Look for Submit button
    await randomDelay(1000, 2000)
    const submitBtn = await page.$(
      'button:has-text("Submit application"), button:has-text("Submit"), footer button[aria-label*="Submit"]'
    )

    if (!submitBtn) {
      // Try "Next" to advance form step
      const nextBtn = await page.$('button:has-text("Next"), button:has-text("Review")')
      if (nextBtn) {
        log('warn', `Submit not visible — multi-step form detected for ${job.title}`)
        await page.keyboard.press('Escape')
        return { success: false, method: 'manual_required', message: 'Multi-step form requires manual completion' }
      }
      return { success: false, method: 'failed', message: 'No submit button found' }
    }

    // Take screenshot before submitting (for audit trail)
    const screenshotPath = path.join(__dirname, `screenshots/${job.id}-before-submit.png`)
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true })
    await page.screenshot({ path: screenshotPath })

    // Submit!
    await randomDelay(1000, 2000)
    await submitBtn.scrollIntoViewIfNeeded()
    await randomDelay(500, 1000)
    await submitBtn.click()
    await randomDelay(3000, 5000)

    // Verify success
    const successIndicator = await page.$('h3:has-text("Your application was sent"), .artdeco-inline-feedback--success')
    if (successIndicator) {
      log('info', `Successfully applied to ${job.title} at ${job.company}`)
      return { success: true, method: 'easy_apply', message: 'Application submitted successfully', screenshot: screenshotPath }
    }

    // Might have succeeded without explicit indicator
    const currentUrl = page.url()
    if (currentUrl.includes('application-submitted') || currentUrl.includes('applied')) {
      return { success: true, method: 'easy_apply', message: 'Application submitted (URL indicator)' }
    }

    return { success: false, method: 'failed', message: 'Could not confirm submission' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', `LinkedIn apply failed for ${job.title}`, { error: msg })
    return { success: false, method: 'failed', message: msg }
  } finally {
    if (page) {
      try { await page.close() } catch { /* ignore */ }
    }
    try { await browser.close() } catch { /* ignore */ }
  }
}

// Email apply — generates formatted email and logs it (no automation needed)
export async function applyViaEmail(job: ApplyJob, userEmail: string): Promise<ApplyResult> {
  const emailBody = `Subject: ${job.apply_kit.tailoredHeadline || `Application for ${job.title}`}

${job.apply_kit.coverLetterOpener || ''}

I am writing to express my strong interest in the ${job.title} position at ${job.company}.

${job.apply_kit.tailoredSummary || ''}

Please find my resume attached. I look forward to discussing this opportunity.

Best regards`

  log('info', `Email apply kit generated for ${job.title} at ${job.company}`)
  return { success: true, method: 'external', message: emailBody }
}

// Save LinkedIn session (run this once after manual login)
export async function captureLinkedInSession(): Promise<void> {
  console.log('Opening LinkedIn for manual login. After logging in, close the browser.')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('https://linkedin.com/login')
  console.log('Please log in manually, then press Ctrl+C')
  // Wait for navigation to home
  await page.waitForURL('**/feed/**', { timeout: 120000 })
  await context.storageState({ path: SESSION_FILE })
  console.log(`Session saved to ${SESSION_FILE}`)
  await browser.close()
}

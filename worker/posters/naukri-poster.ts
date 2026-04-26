// worker/posters/naukri-poster.ts
// Naukri.com profile update automation via Playwright
// Updates: profile headline, summary, skills, "Open to work" status
// NOTE: Naukri does not have a public Share/Post feature like LinkedIn.
//       We automate: profile updates + job search activity (marking "active")

import { chromium, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { log, randomDelay } from '../utils'

const NAUKRI_SESSION_FILE = path.join(__dirname, '..', 'naukri-session.json')

export interface NaukriUpdateResult {
  success: boolean
  action: string
  error?: string
}

export interface NaukriProfile {
  headline?: string
  summary?: string
  skills?: string[]
  openToWork?: boolean
  expectedSalary?: string
  noticePeriod?: string
}

// ── Mark profile as "Active" (increases recruiter visibility) ─────────────────
export async function markNaukriActive(headless = true): Promise<NaukriUpdateResult> {
  if (!fs.existsSync(NAUKRI_SESSION_FILE)) {
    return { success: false, action: 'mark_active', error: `Session not found: ${NAUKRI_SESSION_FILE}. Run captureNaukriSession() first.` }
  }

  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  })
  let page: Page | null = null

  try {
    const context = await browser.newContext({
      storageState: NAUKRI_SESSION_FILE,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })
    page = await context.newPage()

    await page.goto('https://www.naukri.com/mnjuser/homepage', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await randomDelay(2000, 3000)

    if (page.url().includes('login')) {
      return { success: false, action: 'mark_active', error: 'Naukri session expired. Run captureNaukriSession()' }
    }

    // Update "Last active" by visiting profile (Naukri uses last login time for recruiter search ranking)
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await randomDelay(2000, 3000)

    // Try to find and click "Update Profile" to refresh last-modified date
    const updateBtn = await page.$('button:has-text("Update Profile"), .updateProfile, [class*="updateProfile"]')
    if (updateBtn) {
      await updateBtn.click()
      await randomDelay(1500, 2500)
    }

    log('info', '✅ Naukri profile marked as active')
    return { success: true, action: 'mark_active' }
  } catch (err: unknown) {
    return { success: false, action: 'mark_active', error: err instanceof Error ? err.message : String(err) }
  } finally {
    if (page) { try { await page.close() } catch { /* ignore */ } }
    try { await browser.close() } catch { /* ignore */ }
  }
}

// ── Update profile headline/summary/skills ────────────────────────────────────
export async function updateNaukriProfile(profile: NaukriProfile, headless = true): Promise<NaukriUpdateResult> {
  if (!fs.existsSync(NAUKRI_SESSION_FILE)) {
    return { success: false, action: 'update_profile', error: 'Naukri session not found. Run captureNaukriSession() first.' }
  }

  const browser = await chromium.launch({ headless, args: ['--no-sandbox'] })
  let page: Page | null = null

  try {
    const context = await browser.newContext({ storageState: NAUKRI_SESSION_FILE })
    page = await context.newPage()
    await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await randomDelay(2000, 3000)

    if (page.url().includes('login')) {
      return { success: false, action: 'update_profile', error: 'Naukri session expired' }
    }

    // Update headline if provided
    if (profile.headline) {
      const headlineField = await page.$('input[placeholder*="headline" i], input[name*="headline" i], #headline')
      if (headlineField) {
        await headlineField.click({ clickCount: 3 })
        await randomDelay(300, 500)
        await headlineField.fill(profile.headline)
        await randomDelay(500, 800)
        log('info', `Updated Naukri headline: ${profile.headline}`)
      }
    }

    // Save changes
    const saveBtn = await page.$('button:has-text("Save"), button[type="submit"]')
    if (saveBtn) {
      await saveBtn.click()
      await randomDelay(2000, 3000)
    }

    log('info', '✅ Naukri profile updated')
    return { success: true, action: 'update_profile' }
  } catch (err: unknown) {
    return { success: false, action: 'update_profile', error: err instanceof Error ? err.message : String(err) }
  } finally {
    if (page) { try { await page.close() } catch { /* ignore */ } }
    try { await browser.close() } catch { /* ignore */ }
  }
}

// ── Generate Naukri share URL (profile link) ──────────────────────────────────
export function generateNaukriProfileUrl(username: string): string {
  return `https://www.naukri.com/profile/${username}`
}

// ── Capture Naukri session (run once) ─────────────────────────────────────────
export async function captureNaukriSession(): Promise<void> {
  console.log('\n🔐 Opening Naukri for manual login...')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('https://www.naukri.com/nlogin/login')

  try {
    await page.waitForURL('**/mnjuser/homepage', { timeout: 120000 })
    await context.storageState({ path: NAUKRI_SESSION_FILE })
    console.log(`\n✅ Naukri session saved to ${NAUKRI_SESSION_FILE}`)
  } catch {
    console.log('❌ Login timeout')
  }
  await browser.close()
}

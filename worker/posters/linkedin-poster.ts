// worker/posters/linkedin-poster.ts
// Auto-post to LinkedIn via Playwright browser automation
// Requires: linkedin-session.json (same session as auto-apply)

import { chromium, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { log, randomDelay } from '../utils'

const SESSION_FILE = path.join(__dirname, '..', 'linkedin-session.json')

export interface LinkedInPostResult {
  success: boolean
  postUrl?: string
  error?: string
  method: 'browser_automation' | 'one_click_url'
}

export interface PostOptions {
  content: string
  visibility?: 'PUBLIC' | 'CONNECTIONS'
  headless?: boolean
}

// ── OPTION 1: Full browser automation (no user action needed) ─────────────────
export async function postToLinkedIn(options: PostOptions): Promise<LinkedInPostResult> {
  if (!fs.existsSync(SESSION_FILE)) {
    return {
      success: false,
      error: `Session file not found: ${SESSION_FILE}. Run captureLinkedInSession() first.`,
      method: 'browser_automation',
    }
  }

  const headless = options.headless ?? (process.env.HEADLESS === 'true')
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    slowMo: headless ? 0 : 80,
  })

  let page: Page | null = null

  try {
    const context = await browser.newContext({
      storageState: SESSION_FILE,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })

    page = await context.newPage()

    // Navigate to LinkedIn feed
    log('info', 'Navigating to LinkedIn feed for posting...')
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await randomDelay(2000, 3500)

    // Check if logged in
    if (page.url().includes('login') || page.url().includes('authwall')) {
      return { success: false, error: 'LinkedIn session expired. Run captureLinkedInSession()', method: 'browser_automation' }
    }

    // Click "Start a post" button
    const startPostBtn = await page.$(
      'button[aria-label="Start a post"], .share-box-feed-entry__trigger, button:has-text("Start a post")'
    )
    if (!startPostBtn) {
      // Try clicking the text input area
      const postInput = await page.$('.share-box-feed-entry__trigger-v2')
      if (!postInput) {
        return { success: false, error: 'Could not find post creation button', method: 'browser_automation' }
      }
      await postInput.click()
    } else {
      await startPostBtn.click()
    }

    await randomDelay(1500, 2500)

    // Find post text area
    const textArea = await page.waitForSelector(
      '.ql-editor[contenteditable="true"], div[data-placeholder="What do you want to talk about?"], .share-creation-state__text-editor',
      { timeout: 10000 }
    )

    if (!textArea) {
      return { success: false, error: 'Could not find post text area', method: 'browser_automation' }
    }

    await textArea.click()
    await randomDelay(500, 800)

    // Type the post content (use keyboard for more human-like behavior)
    await page.keyboard.type(options.content, { delay: 20 })
    await randomDelay(1500, 2500)

    // Take screenshot before posting
    const screenshotDir = path.join(__dirname, '..', 'screenshots')
    fs.mkdirSync(screenshotDir, { recursive: true })
    await page.screenshot({ path: path.join(screenshotDir, `linkedin-post-${Date.now()}.png`) })

    // Click Post button
    const postBtn = await page.$(
      'button.share-actions__primary-action, button[aria-label="Post"], button:has-text("Post")'
    )
    if (!postBtn) {
      return { success: false, error: 'Could not find Post button', method: 'browser_automation' }
    }

    await randomDelay(1000, 1500)
    await postBtn.click()
    await randomDelay(3000, 5000)

    // Try to get the post URL
    let postUrl: string | undefined
    try {
      // After posting, LinkedIn often shows the post in the feed
      await page.waitForURL(/linkedin\.com\/feed/, { timeout: 8000 })
      // Get most recent post URL
      const postLink = await page.$('a[href*="/posts/"]')
      postUrl = postLink ? await postLink.getAttribute('href') || undefined : undefined
      if (postUrl && !postUrl.startsWith('http')) postUrl = `https://linkedin.com${postUrl}`
    } catch {
      postUrl = 'https://linkedin.com/feed'
    }

    log('info', `✅ LinkedIn post published successfully`)
    return { success: true, postUrl, method: 'browser_automation' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log('error', `LinkedIn posting failed: ${msg}`)
    return { success: false, error: msg, method: 'browser_automation' }
  } finally {
    if (page) { try { await page.close() } catch { /* ignore */ } }
    try { await browser.close() } catch { /* ignore */ }
  }
}

// ── OPTION 2: One-click URL (user clicks Post, takes 2 seconds) ───────────────
export function generateLinkedInShareUrl(content: string): string {
  // LinkedIn share URL pre-fills the post dialog
  const encoded = encodeURIComponent(content)
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`
}

// ── Capture LinkedIn session (run once) ───────────────────────────────────────
export async function captureLinkedInSession(): Promise<void> {
  console.log('\n🔐 Opening LinkedIn for manual login...')
  console.log('1. Log in to your LinkedIn account')
  console.log('2. Wait for the feed to load')
  console.log('3. Session will be saved automatically\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('https://linkedin.com/login')

  try {
    await page.waitForURL('**/feed/**', { timeout: 120000 })
    await context.storageState({ path: SESSION_FILE })
    console.log(`\n✅ Session saved to ${SESSION_FILE}`)
    console.log('⚠️  IMPORTANT: Never commit this file to git!\n')
  } catch {
    console.log('❌ Login timeout. Please try again.')
  }

  await browser.close()
}

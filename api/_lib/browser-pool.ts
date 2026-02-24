// api/_lib/browser-pool.ts
// Custom browser page pool for Puppeteer — reuses a single browser instance
// with a configurable number of concurrent pages.

import puppeteer, { type Browser, type Page } from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const MAX_PAGES = parseInt(process.env.BROWSER_POOL_MAX_PAGES || '5', 10)
const ACQUIRE_TIMEOUT_MS = 60_000

// ── Chrome discovery ────────────────────────────────────────────────

function findLocalChrome(): string | null {
  const possiblePaths: string[] = []

  if (process.platform === 'win32') {
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    )
  } else if (process.platform === 'darwin') {
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    )
  } else {
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    )
  }

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // continue
    }
  }
  return null
}

function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY)
}

// ── Pool state ──────────────────────────────────────────────────────

let browser: Browser | null = null
let launching: Promise<Browser> | null = null
const available: Page[] = []
let activeCount = 0

interface Waiter {
  resolve: (page: Page) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}
const waiters: Waiter[] = []

// ── Browser lifecycle ───────────────────────────────────────────────

async function launchBrowser(): Promise<Browser> {
  let executablePath: string
  let args: string[] = []

  if (isServerless()) {
    const chromium = await import('@sparticuz/chromium')
    executablePath = await chromium.default.executablePath()
    args = chromium.default.args
  } else {
    const localChrome = findLocalChrome()
    if (!localChrome) {
      throw new Error('Chrome/Chromium not found. Please install Chrome or set CHROME_PATH environment variable.')
    }
    executablePath = process.env.CHROME_PATH || localChrome
    args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  }

  const b = await puppeteer.launch({
    args,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
    executablePath,
    headless: true,
  })

  // If the browser crashes / disconnects, reset pool state
  b.on('disconnected', () => {
    console.warn('[BrowserPool] Browser disconnected, resetting pool')
    browser = null
    launching = null
    available.length = 0
    activeCount = 0
    // Reject all pending waiters
    for (const w of waiters.splice(0)) {
      clearTimeout(w.timer)
      w.reject(new Error('Browser disconnected'))
    }
  })

  console.log(`[BrowserPool] Browser launched (max pages: ${MAX_PAGES})`)
  return b
}

async function getBrowser(): Promise<Browser> {
  if (browser) return browser
  // Prevent concurrent launches
  if (!launching) {
    launching = launchBrowser().then(b => {
      browser = b
      launching = null
      return b
    }).catch(err => {
      launching = null
      throw err
    })
  }
  return launching
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Acquire a Puppeteer Page from the pool.
 * - Reuses idle pages when available.
 * - Creates new pages up to MAX_PAGES.
 * - Waits up to 60 s if the pool is full, then throws a user-friendly error.
 */
export async function acquirePage(): Promise<Page> {
  const b = await getBrowser()

  // 1. Reuse an idle page
  if (available.length > 0) {
    activeCount++
    return available.pop()!
  }

  // 2. Create a new page if under limit
  if (activeCount < MAX_PAGES) {
    activeCount++
    try {
      return await b.newPage()
    } catch (err) {
      activeCount--
      throw err
    }
  }

  // 3. Wait for a page to become available
  return new Promise<Page>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = waiters.findIndex(w => w.resolve === resolve)
      if (idx !== -1) waiters.splice(idx, 1)
      reject(new Error('Сервер перегружен, попробуйте через несколько секунд'))
    }, ACQUIRE_TIMEOUT_MS)

    waiters.push({ resolve, reject, timer })
  })
}

/**
 * Release a Page back to the pool for reuse.
 * Navigates to about:blank to free memory from the previous document.
 */
export async function releasePage(page: Page): Promise<void> {
  try {
    // Reset page state
    await page.goto('about:blank', { timeout: 5000 }).catch(() => {})

    // Hand to the first waiter, if any
    if (waiters.length > 0) {
      const waiter = waiters.shift()!
      clearTimeout(waiter.timer)
      waiter.resolve(page)
      return
    }

    // Return to idle pool
    available.push(page)
    activeCount--
  } catch {
    // Page is broken — discard it
    activeCount--
    try { await page.close() } catch { /* ignore */ }
  }
}

/**
 * Graceful shutdown: close all pages and the browser.
 */
export async function closeBrowserPool(): Promise<void> {
  for (const w of waiters.splice(0)) {
    clearTimeout(w.timer)
    w.reject(new Error('Pool shutting down'))
  }
  for (const p of available.splice(0)) {
    try { await p.close() } catch { /* ignore */ }
  }
  activeCount = 0
  if (browser) {
    await browser.close().catch(() => {})
    browser = null
  }
  console.log('[BrowserPool] Pool closed')
}

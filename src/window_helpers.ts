import type { ElectronApplication, Page } from 'playwright-core'
import { retry, RetryOptions } from './utilities'

/**
 * A function that evaluates a Page and returns whether it matches.
 */
export type WindowMatcher = (page: Page) => boolean | Promise<boolean>

/**
 * Options for waiting for a window.
 */
export interface WaitForWindowOptions extends Partial<RetryOptions> {
  /** Timeout in ms (default: 10000) */
  timeout?: number
  /** Polling interval in ms (default: 200) */
  interval?: number
}

/**
 * Helper to match a string against a pattern (string or RegExp).
 * For strings, performs a substring match (includes).
 * For RegExp, tests the pattern against the value.
 */
function matchesPattern(value: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(value)
  }
  return value.includes(pattern)
}

// ============================================================================
// getWindowByUrl
// ============================================================================

/**
 * Get the first window whose URL matches the given pattern.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param pattern - A string (substring match) or RegExp to match against the URL
 * @param options - Optional RetryOptions
 * @returns The first matching Page, or undefined if no match found
 *
 * @example
 * ```ts
 * const settingsWindow = await getWindowByUrl(app, '/settings')
 * const authWindow = await getWindowByUrl(app, /auth|login/)
 * ```
 */
export async function getWindowByUrl(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: Partial<RetryOptions>
): Promise<Page | undefined>

/**
 * Get all windows whose URL matches the given pattern.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param pattern - A string (substring match) or RegExp to match against the URL
 * @param options - Options with `all: true` to return all matches
 * @returns An array of matching Pages
 *
 * @example
 * ```ts
 * const allSettingsWindows = await getWindowByUrl(app, '/settings', { all: true })
 * ```
 */
export async function getWindowByUrl(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options: Partial<RetryOptions> & { all: true }
): Promise<Page[]>

export async function getWindowByUrl(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: Partial<RetryOptions> & { all?: boolean }
): Promise<Page | Page[] | undefined> {
  return getWindowByMatcher(
    electronApp,
    async (page) => {
      const url = page.url()
      if (!url) {
        try {
          await page.waitForURL((u) => !!u, { timeout: 1000 })
        } catch {
          return false
        }
      }
      return matchesPattern(page.url(), pattern)
    },
    options as Partial<RetryOptions> & { all?: boolean }
  )
}

// ============================================================================
// getWindowByTitle
// ============================================================================

/**
 * Get the first window whose title matches the given pattern.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param pattern - A string (substring match) or RegExp to match against the title
 * @param options - Optional RetryOptions
 * @returns The first matching Page, or undefined if no match found
 *
 * @example
 * ```ts
 * const prefsWindow = await getWindowByTitle(app, 'Preferences')
 * const windowN = await getWindowByTitle(app, /Window \d+/)
 * ```
 */
export async function getWindowByTitle(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: Partial<RetryOptions>
): Promise<Page | undefined>

/**
 * Get all windows whose title matches the given pattern.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param pattern - A string (substring match) or RegExp to match against the title
 * @param options - Options with `all: true` to return all matches
 * @returns An array of matching Pages
 *
 * @example
 * ```ts
 * const allNumberedWindows = await getWindowByTitle(app, /Window \d+/, { all: true })
 * ```
 */
export async function getWindowByTitle(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options: Partial<RetryOptions> & { all: true }
): Promise<Page[]>

export async function getWindowByTitle(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: Partial<RetryOptions> & { all?: boolean }
): Promise<Page | Page[] | undefined> {
  return getWindowByMatcher(
    electronApp,
    async (page) => {
      const title = await page.title()
      return matchesPattern(title, pattern)
    },
    options as Partial<RetryOptions> & { all?: boolean }
  )
}

// ============================================================================
// getWindowByMatcher
// ============================================================================

/**
 * Get the first window that matches the provided matcher function.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param matcher - A function that receives a Page and returns true if it matches
 * @param options - Optional RetryOptions
 * @returns The first matching Page, or undefined if no match found
 *
 * @example
 * ```ts
 * const largeWindow = await getWindowByMatcher(app, async (page) => {
 *   const size = await page.viewportSize()
 *   return size && size.width > 1000
 * })
 * ```
 */
export async function getWindowByMatcher(
  electronApp: ElectronApplication,
  matcher: WindowMatcher,
  options?: Partial<RetryOptions>
): Promise<Page | undefined>

/**
 * Get all windows that match the provided matcher function.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param matcher - A function that receives a Page and returns true if it matches
 * @param options - Options with `all: true` to return all matches
 * @returns An array of matching Pages
 *
 * @example
 * ```ts
 * const allLargeWindows = await getWindowByMatcher(app, async (page) => {
 *   const size = await page.viewportSize()
 *   return size && size.width > 1000
 * }, { all: true })
 * ```
 */
export async function getWindowByMatcher(
  electronApp: ElectronApplication,
  matcher: WindowMatcher,
  options: Partial<RetryOptions> & { all: true }
): Promise<Page[]>

export async function getWindowByMatcher(
  electronApp: ElectronApplication,
  matcher: WindowMatcher,
  options?: Partial<RetryOptions> & { all?: boolean }
): Promise<Page | Page[] | undefined> {
  const { all, ...retryOpts } = options || {}

  const findWindows = async (): Promise<Page | Page[] | undefined> => {
    const windows = electronApp.windows()

    if (all) {
      const results: Page[] = []
      for (const page of windows) {
        if (await matcher(page)) {
          results.push(page)
        }
      }
      return results
    }

    // Return first match
    for (const page of windows) {
      if (await matcher(page)) {
        return page
      }
    }
    return undefined
  }

  return retry(findWindows, retryOpts)
}

// ============================================================================
// waitForWindowByUrl
// ============================================================================

/**
 * Wait for a window whose URL matches the given pattern.
 *
 * This function checks existing windows first, then listens for new windows.
 * It uses polling to handle windows that may have their URL change after opening.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param pattern - A string (substring match) or RegExp to match against the URL
 * @param options - Optional timeout and interval settings
 * @returns The matching Page
 * @throws Error if timeout is reached before a matching window is found
 *
 * @example
 * ```ts
 * // Click something that opens a new window, then wait for it
 * await page.click('#open-settings')
 * const settingsWindow = await waitForWindowByUrl(app, '/settings', { timeout: 5000 })
 * ```
 */
export async function waitForWindowByUrl(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: WaitForWindowOptions
): Promise<Page> {
  return waitForWindowByMatcher(
    electronApp,
    async (page) => {
      const url = page.url()
      if (!url) {
        try {
          await page.waitForURL((u) => !!u, { timeout: 1000 })
        } catch {
          return false
        }
      }
      return matchesPattern(page.url(), pattern)
    },
    options
  )
}

// ============================================================================
// waitForWindowByTitle
// ============================================================================

/**
 * Wait for a window whose title matches the given pattern.
 *
 * This function checks existing windows first, then listens for new windows.
 * It uses polling to handle windows that may have their title change after opening.
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param pattern - A string (substring match) or RegExp to match against the title
 * @param options - Optional timeout and interval settings
 * @returns The matching Page
 * @throws Error if timeout is reached before a matching window is found
 *
 * @example
 * ```ts
 * // Wait for a window with a specific title to appear
 * const prefsWindow = await waitForWindowByTitle(app, 'Preferences', { timeout: 5000 })
 * ```
 */
export async function waitForWindowByTitle(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: WaitForWindowOptions
): Promise<Page> {
  return waitForWindowByMatcher(
    electronApp,
    async (page) => {
      const title = await page.title()
      return matchesPattern(title, pattern)
    },
    options
  )
}

// ============================================================================
// waitForWindowByMatcher
// ============================================================================

/**
 * Wait for a window that matches the provided matcher function.
 *
 * This function:
 * 1. Checks existing windows first
 * 2. Listens for new window events
 * 3. Polls existing windows periodically (to catch URL/title changes)
 *
 * @category Window Helpers
 *
 * @param electronApp - The Playwright ElectronApplication
 * @param matcher - A function that receives a Page and returns true if it matches
 * @param options - Optional timeout and interval settings
 * @returns The matching Page
 * @throws Error if timeout is reached before a matching window is found
 *
 * @example
 * ```ts
 * const window = await waitForWindowByMatcher(app, async (page) => {
 *   const title = await page.title()
 *   return title.startsWith('Document:')
 * }, { timeout: 10000 })
 * ```
 */
export async function waitForWindowByMatcher(
  electronApp: ElectronApplication,
  matcher: WindowMatcher,
  options?: WaitForWindowOptions
): Promise<Page> {
  const timeout = options?.timeout ?? 10000
  const interval = options?.interval ?? 200

  // Check existing windows first
  const windows = electronApp.windows()
  for (const page of windows) {
    if (await matcher(page)) {
      return page
    }
  }

  // Race between:
  // 1. waitForEvent('window') with predicate for new windows
  // 2. Polling existing windows for changes (URL/title may change after load)
  return Promise.race([
    // Wait for new window that matches
    electronApp.waitForEvent('window', {
      timeout,
      predicate: matcher,
    }),
    // Poll existing windows
    new Promise<Page>((resolve, reject) => {
      const startTime = Date.now()
      const pollInterval = setInterval(async () => {
        try {
          if (Date.now() - startTime > timeout) {
            clearInterval(pollInterval)
            reject(
              new Error(
                `Timeout waiting for window matching criteria after ${timeout}ms`
              )
            )
            return
          }

          const windows = electronApp.windows()
          for (const page of windows) {
            if (await matcher(page)) {
              clearInterval(pollInterval)
              resolve(page)
              return
            }
          }
        } catch (error) {
          clearInterval(pollInterval)
          reject(error)
        }
      }, interval)
    }),
  ])
}

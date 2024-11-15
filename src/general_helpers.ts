import type { ElectronApplication, JSHandle, Page } from 'playwright-core'
import type { PageFunctionOn } from 'playwright-core/types/structs'
import { retry, RetryOptions } from './utilities'

/**
 * Wait for a function to evaluate to true in the main Electron process. This really
 * should be part of the Playwright API, but it's not.
 *
 * This function is to `electronApp.evaluate()`
 * as `page.waitForFunction()` is `page.evaluate()`.
 *
 * @param electronApp {ElectronApplication} - the Playwright ElectronApplication
 * @param fn {Function} - the function to evaluate in the main process - must return a boolean
 * @param arg {Any} optional - an argument to pass to the function
 * @returns {Promise<void>}
 * @fulfil {void} Resolves when the function returns true
 */
export async function electronWaitForFunction<R, Arg>(
  electronApp: ElectronApplication,
  fn: PageFunctionOn<typeof Electron.CrossProcessExports, Arg, R>,
  arg?: Arg,
  options: RetryOptions = {}
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  while (!(await retry(() => electronApp.evaluate(fn, arg), options))) {
    // wait 100ms before trying again
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

/**
 * Electron's `evaluate` function can be flakey,
 * throwing an error saying the execution context has been destroyed.
 * This function retries the evaluation several times to see if it can
 * run the evaluation without an error. If it fails after the retries,
 * it throws the error.
 *
 * @param electronApp {ElectronApplication} - the Playwright ElectronApplication
 * @param fn {Function} - the function to evaluate in the main process
 * @param arg {Any} - an argument to pass to the function
 * @param retries - the number of times to retry the evaluation
 * @param retryIntervalMs - the interval between retries
 * @returns {Promise<R>} - the result of the evaluation
 */
export async function evaluateWithRetry<R, Arg>(
  electronApp: ElectronApplication,
  fn: PageFunctionOn<typeof Electron.CrossProcessExports, Arg, R>,
  arg = {} as Arg,
  options: RetryOptions = {}
): Promise<R> {
  return retry(() => electronApp.evaluate(fn, arg), options)
}

/**
 * Returns the BrowserWindow object that corresponds to the given Playwright page (with retries).
 *
 * This is basically a wrapper around `[app.browserWindow(page)](https://playwright.dev/docs/api/class-electronapplication#electron-application-browser-window)`
 * that retries the operation.
 *
 * @param app - The Electron application instance.
 * @param page - The Playwright page instance.
 * @param options - Optional configuration for retries.
 * @param options.retries - The number of retry attempts. Defaults to 5.
 * @param options.intervalMs - The interval between retries in milliseconds. Defaults to 200.
 * @returns A promise that resolves to the browser window.
 * @throws Will throw an error if all retry attempts fail.
 */
export async function browserWindowWithRetry(
  app: ElectronApplication,
  page: Page,
  options: RetryOptions = {}
): Promise<JSHandle> {
  return retry(() => app.browserWindow(page), options)
}

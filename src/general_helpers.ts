import type { ElectronApplication } from 'playwright-core'
import type { PageFunctionOn } from 'playwright-core/types/structs'

export type EvaluateWithRetryOptions = {
  retries?: number
  intervalMs?: number
}

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
  options: EvaluateWithRetryOptions = {}
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  while (!(await evaluateWithRetry(electronApp, fn, arg, options))) {
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
  options: EvaluateWithRetryOptions = {}
): Promise<R> {
  const { retries = 5, intervalMs = 200 } = options
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await electronApp.evaluate(fn, arg)
    } catch (err) {
      if (attempt >= retries) {
        console.error(`evaluateWithRetry failed after ${retries} attempts`)
        throw err
      }
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`evaluateWithRetry attempt ${attempt} failed: ${message}`)
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      // go around again
    }
  }
  return null as never
}

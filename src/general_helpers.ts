import type { ElectronApplication } from 'playwright-core'
import type { PageFunctionOn } from 'playwright-core/types/structs'

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
  arg?: Arg
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  while (!(await evaluateWithRetry(electronApp, fn, arg))) {
    // wait 100ms before trying again
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

/**
 * Electron's `evaluate` function can be flakey,
 * throwing an error saying the execution context has been destroyed.
 * This function retries the evaluation a few times before giving up.
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
  retries = 5,
  retryIntervalMs = 200
): Promise<R> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await electronApp.evaluate(fn, arg)
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('Execution context was destroyed')
      ) {
        if (attempt === retries) {
          console.error(`evaluateWithRetry failed after ${retries} attempts`)
          throw error
        }
        console.warn(
          `evaluateWithRetry attempt ${attempt} failed: ${error.message}`
        )
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
        // go around again
      } else {
        throw error
      }
    }
  }
  return null as never
}

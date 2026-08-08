import type { ElectronApplication } from 'playwright-core'
import type { PageFunctionOn } from 'playwright-core/types/structs'
import {
  retry,
  retryUntilTruthy,
  RetryOptions,
  RetryUntilTruthyOptions,
} from './utilities'

/**
 * Wait for a function to evaluate to true in the main Electron process. This really
 * should be part of the Playwright API, but it's not.
 *
 * This function is to `electronApp.evaluate()`
 * as `page.waitForFunction()` is `page.evaluate()`.
 *
 * Gives up once `options.timeout` has elapsed, so a function that never returns
 * true rejects rather than polling forever.
 *
 * @param electronApp {ElectronApplication} - the Playwright ElectronApplication
 * @param fn {Function} - the function to evaluate in the main process - must return a boolean
 * @param arg {Any} optional - an argument to pass to the function
 * @param {number} [options.timeout=5000] - how long to keep polling, in total, before giving up
 * @param {number} [options.poll=100] - how long to wait between polls after a falsy result
 * @param {number} [options.retryTimeout=5000] - how long a single `evaluate()` may take before it is retried
 * @param {number} [options.retryPoll=200] - how long to wait before retrying after an error
 * @param {string|string[]|RegExp} [options.retryErrorMatch] - errors to retry. Others throw immediately
 * @returns {Promise<void>}
 * @fulfil {void} Resolves when the function returns true
 * @throws {Error} if the function has not returned true before `options.timeout` elapses
 */
export async function electronWaitForFunction<R, Arg>(
  electronApp: ElectronApplication,
  fn: PageFunctionOn<typeof Electron.CrossProcessExports, Arg, R>,
  arg?: Arg,
  options: Partial<RetryUntilTruthyOptions & RetryOptions> = {},
): Promise<void> {
  // `errorMatch` and `disable` used to reach the inner retry() directly, since
  // this took RetryOptions. Keep honoring them under their retry* names.
  const { errorMatch, disable, ...rest } = options
  await retryUntilTruthy(
    // @ts-ignore
    () => electronApp.evaluate(fn, arg),
    {
      ...rest,
      ...(errorMatch !== undefined && { retryErrorMatch: errorMatch }),
      ...(disable !== undefined && { retryDisable: disable }),
    },
  )
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
  options: Partial<RetryOptions> = {},
): Promise<R> {
  return retry(() => electronApp.evaluate(fn, arg), options)
}

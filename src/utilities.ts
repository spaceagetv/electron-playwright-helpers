import * as helpers from './'

export type AllHelpers = typeof helpers

export type AllPromiseHelpers = {
  [K in keyof AllHelpers]: ReturnType<AllHelpers[K]> extends Promise<unknown>
    ? AllHelpers[K]
    : never
}

export type AllPromiseHelpersWithoutTimeout = Omit<
  AllPromiseHelpers,
  'addTimeoutToPromise' | 'addTimeout'
>

export type HelperFunctionName = keyof AllPromiseHelpersWithoutTimeout

/**
 * Add a timeout to any Promise
 *
 * @category Utilities
 * @see addTimeout
 *
 * @param promise - the promise to add a timeout to - must be a Promise
 * @param timeoutMs - the timeout in milliseconds - defaults to 5000
 * @param timeoutMessage - optional - the message to return if the timeout is reached
 *
 * @returns {Promise<T>} the result of the original promise if it resolves before the timeout
 */
export async function addTimeoutToPromise<T>(
  promise: Promise<T>,
  timeoutMs = 5000,
  timeoutMessage?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(
        timeoutMessage
          ? new Error(timeoutMessage)
          : new Error(`timeout after ${timeoutMs}ms`)
      )
    }, timeoutMs)
    promise
      .then((result) => {
        resolve(result)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * Add a timeout to any helper function from this library which returns a Promise.
 *
 * @category Utilities
 *
 * @param functionName - the name of the helper function to call
 * @param timeoutMs - the timeout in milliseconds - defaults to 5000
 * @param timeoutMessage - optional - the message to return if the timeout is reached
 * @param args - any arguments to pass to the helper function
 *
 * @returns {Promise<T>} the result of the helper function if it resolves before the timeout
 */
export function addTimeout<T extends HelperFunctionName>(
  functionName: T,
  timeoutMs = 5000,
  timeoutMessage?: string,
  ...args: Parameters<AllPromiseHelpers[T]>
): ReturnType<AllPromiseHelpers[T]> {
  return addTimeoutToPromise(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    helpers[functionName](...args),
    timeoutMs,
    timeoutMessage
  ) as ReturnType<AllPromiseHelpers[T]>
}

export type RetryOptions = {
  /** The maximum time to wait before giving up (in milliseconds) */
  timeout: number
  /** The delay between each retry attempt in milliseconds. Or use "raf" for requestAnimationFrame. */
  poll: number | 'raf'
  /**
   * The error message or pattern to match against. Errors that don't match will throw immediately.
   * If a string or array of strings, the error will throw if it does not contain (one of) the passed string(s).
   * If a RegExp, the error will throw if it does not match the pattern.
   */
  errorMatch: string | string[] | RegExp
  /** If true, the retry function will be disabled and will throw immediately. */
  disable: boolean
}

/**
 * Retries a function until it returns without throwing an error.
 *
 * Starting with Electron 27, Playwright can get very flakey when running code in Electron's main or renderer processes.
 * It will often throw errors like "context or browser has been closed" or "Promise was collected" for no apparent reason.
 * This function retries a given function until it returns without throwing one of these errors, or until the timeout is reached.
 *
 *
 * @example
 *
 * You can simply wrap your Playwright calls in this function to make them more reliable:
 *
 * ```javascript
 * test('my test', async () => {
 *   // instead of this:
 *   const oldWayRenderer = await page.evaluate(() => document.body.classList.contains('active'))
 *   const oldWayMain = await electronApp.evaluate(({}) => document.body.classList.contains('active'))
 *   // use this:
 *   const newWay = await retry(() =>
 *     page.evaluate(() => document.body.classList.contains('active'))
 *   )
 *   // note the `() =>` in front of the original function call
 *   // and the `await` keyword in front of `retry`,
 *   // but NOT in front of `page.evaluate`
 * })
 * ```
 *
 * @category Utilities
 *
 * @template T The type of the value returned by the function.
 * @param {Function} fn The function to retry.
 * @param {RetryOptions} [options={}] The options for retrying the function.
 * @param {number} [options.timeout=5000] The maximum time to wait before giving up in milliseconds.
 * @param {number} [options.poll=200] The delay between each retry attempt in milliseconds.
 * @param {string|string[]|RegExp} [options.errorMatch=['context or browser has been closed', 'Promise was collected', 'Execution context was destroyed']] String(s) or regex to match against error message. If the error does not match, it will throw immediately. If it does match, it will retry.
 * @returns {Promise<T>} A promise that resolves with the result of the function or rejects with an error or timeout message.
 */
export async function retry<T>(
  fn: () => Promise<T> | T,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { poll, timeout, errorMatch } = {
    ...getRetryOptions(),
    ...options,
  }
  let lastErr: unknown
  const startTime = Date.now()

  let tries = 0

  const shouldContinue = () => {
    // always run once
    if (tries < 1) return true
    // if retries are disabled, don't run a second time
    if (options.disable) return false
    // if timeout is not reached, keep trying
    if (Date.now() - startTime < timeout) {
      return true
    }
    return false
  }

  while (shouldContinue()) {
    tries++
    try {
      // Do it!
      return await fn()
    } catch (err) {
      lastErr = err
      const errString = errToString(err)
      if (
        (typeof errorMatch === 'string' &&
          !errString.toLowerCase().includes(errorMatch.toLowerCase())) ||
        (errorMatch instanceof RegExp && !errorMatch.test(errString)) ||
        (Array.isArray(errorMatch) &&
          !errorMatch.some((match) =>
            errString.toLowerCase().includes(match.toLowerCase())
          ))
      ) {
        // it's not a matching error, throw immediately
        throw err
      }
      if (!shouldContinue()) {
        if (options.disable) {
          // if matching error was thrown, but retries are disabled
          // just return undefined
          return
        }
        break
      }
      if (poll === 'raf') {
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
          // we're in a renderer environment and can use requestAnimationFrame
          await new Promise((resolve) => requestAnimationFrame(resolve))
        } else {
          // we're in Node.js or another environment without requestAnimationFrame
          await new Promise((resolve) => setTimeout(resolve, 20))
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, poll))
      }
    }
  }
  const errMessage = lastErr ? ' Last throw: ' + errToString(lastErr) : ''
  throw new Error(`retry()::Timeout after ${timeout}ms.${errMessage}`)
}

const retryDefaults: RetryOptions = {
  disable: false,
  poll: 200,
  timeout: 5000,
  errorMatch: [
    'context or browser has been closed',
    'Promise was collected',
    // Execution context was destroyed, most likely because of a navigation.
    'Execution context was destroyed',
    // "Cannot read properties of undefined (reading 'getOwnerBrowserWindow')"
    `reading 'getOwnerBrowserWindow'`,
  ],
}

const currentRetryOptions: RetryOptions = { ...retryDefaults }

/**
 * Sets the default retry() options. These options will be used for all subsequent calls to retry() unless overridden.
 * You can reset the defaults at any time by calling resetRetryOptions().
 *
 * @category Utilities
 *
 * @param options - A partial object containing the retry options to be set.
 * @returns The updated retry options.
 */
export function setRetryOptions(options: Partial<RetryOptions>): RetryOptions {
  Object.assign(currentRetryOptions, options)
  return currentRetryOptions
}

/**
 * Gets the current default retry options.
 *
 * @category Utilities
 *
 * @returns The current retry options.
 */
export function getRetryOptions(): RetryOptions {
  return { ...currentRetryOptions }
}

/**
 * Resets the retry options to their default values.
 *
 * The default values are:
 * - retries: 20
 * - intervalMs: 200
 * - timeoutMs: 5000
 * - errorMatch: 'context or browser has been closed'
 *
 * @category Utilities
 */
export function resetRetryOptions(): void {
  Object.assign(currentRetryOptions, retryDefaults)
}

export function isRetryOptions(options: unknown): options is RetryOptions {
  if (typeof options !== 'object' || options === null) {
    // if it's not an object
    return false
  }
  const validKeys = Object.keys(retryDefaults)
  // if every one of the keys in the passed object is a valid key
  return Object.keys(options).every((key) => validKeys.includes(key))
}

export type RetryUntilTruthyOptions = {
  /** The maximum time (milliseconds) to wait for a truthy result. Default 5000. */
  timeout: number
  /** The interval (milliseconds) between each retry (after a falsy result) */
  poll: number | 'raf'
  /** The maximum amount of time (milliseconds) to wait for an individual try to return a result */
  retryTimeout: number
  /** The amount of time (milliseconds) to wait before retrying after an error */
  retryPoll: number
  /** The error message or pattern to match against. Errors that don't match will throw immediately. */
  retryErrorMatch: string | string[] | RegExp
  /** If true, the retry function will be disabled and will throw immediately. */
  retryDisable: boolean
}

/**
 * Retries a given function until it returns a truthy value or the timeout is reached.
 *
 * This offers similar functionality to Playwright's [`page.waitForFunction()`](https://playwright.dev/docs/api/class-page#page-wait-for-function)
 * method – but with more flexibility and control over the retry attempts. It also defaults to ignoring common errors due to
 * the way that Playwright handles browser contexts.
 *
 * @example
 *
 * ```javascript
 * test('my test', async () => {
 *   // this will fail immediately if Playwright's context gets weird:
 *   const oldWay = await page.waitForFunction(() => document.body.classList.contains('ready'))
 *
 *  // this will not fail if Playwright's context gets weird:
 *   const newWay = await retryUntilTruthy(() =>
 *     page.evaluate(() => document.body.classList.contains('ready'))
 *   )
 * })
 * ```
 *
 * @template T - The type of the value returned by the function.
 * @param {Function} fn - The function to retry. It can return a promise or a value. It should NOT return void/undefined.
 * @param {number} [timeoutMs=5000] - The maximum time in milliseconds to keep retrying the function. Defaults to 5000ms.
 * @param {number} [intervalMs=100] - The delay between each retry attempt in milliseconds. Defaults to 100ms.
 * @param {number} [options.retryTimeout=5000] - The maximum time in milliseconds to wait for an individual try to return a result. Defaults to 5000ms.
 * @param {number} [options.retryPoll=200] - The delay between each retry attempt in milliseconds. Defaults to 200ms.
 * @param {string|string[]|RegExp} [options.retryErrorMatch] - The error message or pattern to match against. Errors that don't match will throw immediately.
 * @returns {Promise<T>} - A promise that resolves to the truthy value returned by the function.
 * @throws {Error} - Throws an error if the timeout is reached before a truthy value is returned.
 */
export async function retryUntilTruthy<T>(
  fn: () => Promise<T> | T,
  options: Partial<RetryUntilTruthyOptions> = {}
): Promise<T> {
  const {
    timeout = 5000,
    poll = 100,
    retryPoll,
    retryTimeout,
    retryErrorMatch,
    retryDisable,
  } = options
  const retryOptions: RetryOptions = {
    ...(retryPoll !== undefined && { poll: retryPoll }),
    ...(retryTimeout !== undefined && { timeout: retryTimeout }),
    ...(retryErrorMatch && { errorMatch: retryErrorMatch }),
    ...(retryDisable !== undefined && { disable: retryDisable }),
  }
  const timeoutTime = Date.now() + timeout
  while (Date.now() < timeoutTime) {
    const result = await retry(fn, retryOptions)
    if (result) {
      return result
    }
    if (poll === 'raf') {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, poll))
    }
  }
  throw new Error(`retryUntilTruthy::Timeout after ${timeout}ms`)
}

/**
 * Converts an unknown error to a string representation.
 *
 * This function handles different types of errors and attempts to convert them
 * to a string in a meaningful way. It checks if the error is an object with a
 * `toString` method and uses that method if available. If the error is a string,
 * it returns the string directly. For other types, it converts the error to a
 * JSON string.
 *
 * @category Utilities
 *
 * @param err - The unknown error to be converted to a string.
 * @returns A string representation of the error.
 */
export function errToString(err: unknown): string {
  if (err instanceof Error) {
    return err.toString()
  } else if (typeof err === 'string') {
    return err
  } else {
    return JSON.stringify(err)
  }
}

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
  timeoutMessage?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(
        timeoutMessage
          ? new Error(timeoutMessage)
          : new Error(`timeout after ${timeoutMs}ms`),
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
    // @ts-ignore
    helpers[functionName](...args),
    timeoutMs,
    timeoutMessage,
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
  /**
   * If true, the function is only ever called once - it is never retried.
   *
   * This is used for non-idempotent actions (e.g. `clickMenuItemById()`), where retrying
   * could fire the action a second time. Errors are still thrown, with one exception:
   * a *teardown* error (see `teardownErrorMatch`) is swallowed, because it means the
   * action fired and then took its own execution context down with it - for example a
   * menu item which quits the app or closes the window it was called on.
   *
   * Note that `retry()` only widens its return type to `Promise<T | undefined>` when
   * `disable: true` is passed directly to the call. Setting it globally through
   * `setRetryOptions()` has the same runtime effect, but the types cannot see it.
   */
  disable: boolean
}

/**
 * Errors which mean the execution context went away *after* the call was dispatched,
 * i.e. the action most likely happened, and only the reply was lost. When retries are
 * disabled these are swallowed rather than thrown.
 *
 * @ignore
 */
const teardownErrorMatch = [
  'context or browser has been closed',
  // Execution context was destroyed, most likely because of a navigation.
  'Execution context was destroyed',
  // "Cannot read properties of undefined (reading 'getOwnerBrowserWindow')"
  `reading 'getOwnerBrowserWindow'`,
]

/**
 * Errors which mean V8 garbage-collected the promise that Playwright was awaiting.
 *
 * Playwright sends `Runtime.callFunctionOn` with `awaitPromise: true`, and V8's
 * inspector tracks the promise it is awaiting through a *weak* handle
 * (`ProtocolPromiseHandler` in `v8/src/inspector/injected-script.cc`). If that
 * promise becomes unreachable in the target heap before it settles, the weak
 * callback fires and CDP answers "Promise was collected". Playwright >= 1.62
 * rewrites that to "Resulting promise was garbage collected."
 * (`crExecutionContext.ts::rewriteError`).
 *
 * In practice only the rewritten wording ever reaches a caller: Playwright
 * >= 1.62 replaces the error outright, and Playwright < 1.62 has no branch for
 * the raw message at all, so it falls through `rewriteError`'s catch-all and
 * arrives disguised as "Execution context was destroyed" - i.e. on those
 * versions a collected promise is still retried, as a teardown error. The raw
 * wording is kept here anyway, in case it is ever surfaced directly.
 *
 * This is **not** a transient failure and is deliberately NOT in
 * {@link retryDefaults}.`errorMatch` - see the note on {@link retry}.
 *
 * @ignore
 */
const gcErrorMatch = ['Promise was collected', 'promise was garbage collected']

/**
 * Appended to a garbage-collected-promise error, because the raw message names
 * the symptom and not the cause.
 *
 * @ignore
 */
const gcErrorHelp = [
  'V8 collected the promise Playwright was awaiting before it could settle.',
  'Two different things produce this, and they want opposite responses:',
  '',
  '1. An evaluate() callback returned a promise that nothing in the target',
  '   process references - e.g. `evaluate(() => new Promise(() => {}))`. This is',
  '   deterministic, not flaky: it fails the same way every time, so retrying',
  '   only wastes the timeout. The callback body has ALREADY RUN - its side',
  '   effects happened and only the reply was lost, so a retry fires them twice.',
  '   Fix the callback: return a value, or a promise that something retains (an',
  '   Electron API call, a timer, an event listener), rather than one nothing',
  '   holds.',
  '',
  '2. A raw Playwright channel call - electronApp.browserWindow(),',
  '   JSHandle.getProperty() and friends - lost an internal promise mid-flight.',
  '   You wrote no callback here, so there is nothing to fix in your code. This',
  '   one IS transient and worth retrying.',
  '',
  'The message is identical either way, so this library cannot tell them apart',
  'and does not retry by default - silently repeating a side effect is the worse',
  'failure. If yours is case 2, opt in per call. Note that errorMatch REPLACES',
  'the default list rather than extending it, so repeat the defaults you still',
  'want. See the README.',
].join('\n')

/**
 * Attach {@link gcErrorHelp} to a garbage-collected-promise error.
 *
 * Appends to the original error rather than wrapping it, so its identity and
 * stack survive. `.stack` has to be rebuilt from its own frames afterwards:
 * V8 renders it lazily and then caches it, so a `.stack` that was already read
 * would keep the old message and the note would never appear in whatever a
 * test reporter prints. Playwright does the same dance in `rewriteErrorMessage()`.
 *
 * @ignore
 */
function explainGcError(err: unknown, errString: string): unknown {
  if (!(err instanceof Error)) {
    return new Error(`${errString}\n\n${gcErrorHelp}`)
  }
  // helpers call retry() internally, so a retry() around a helper sees an error
  // an inner retry() already explained - don't say it twice
  if (err.message.includes(gcErrorHelp)) {
    return err
  }
  try {
    err.message = `${err.message}\n\n${gcErrorHelp}`
  } catch {
    // a frozen error, or a subclass whose `message` is getter-only. Assigning
    // throws under "use strict" - the original error is worth more than the note
    return err
  }
  const frames = (err.stack?.split('\n') || []).filter((line) =>
    line.startsWith('    at '),
  )
  if (frames.length) {
    err.stack = [`${err.name}: ${err.message}`, ...frames].join('\n')
  }
  return err
}

/**
 * Test an error string against a `RetryOptions['errorMatch']` matcher.
 * String matching is case-insensitive and by substring; RegExps are tested as-is.
 *
 * @ignore
 */
function errorMatches(
  errString: string,
  match: string | string[] | RegExp,
): boolean {
  if (match instanceof RegExp) {
    // `test()` advances lastIndex on /g and /y patterns, so the same matcher would
    // miss on the next retry. Test a fresh clone - its lastIndex starts at 0, and
    // keeping the flags preserves sticky semantics - rather than resetting
    // lastIndex on the caller's own RegExp.
    return new RegExp(match.source, match.flags).test(errString)
  }
  const matchers = Array.isArray(match) ? match : [match]
  return matchers.some(
    (m) =>
      typeof m === 'string' &&
      errString.toLowerCase().includes(m.toLowerCase()),
  )
}

/**
 * Retries a function until it returns without throwing an error.
 *
 * Starting with Electron 27, Playwright can get very flakey when running code in Electron's main or renderer processes.
 * It will throw errors like "context or browser has been closed" or "Execution context was destroyed" when the
 * execution context a call was dispatched into goes away underneath it. Playwright has no recovery for this on the
 * Electron main process - it resolves a single `require('electron')` handle when the app launches and never
 * re-acquires it - so retrying is the only option available from the outside.
 * This function retries a given function until it returns without throwing one of these errors, or until the timeout is reached.
 *
 * Note that "Resulting promise was garbage collected." is deliberately *not* retried. Despite appearances it is not a
 * flake: it means the evaluate callback returned a promise nothing in the target process references, so V8 collected
 * it before it settled. Every attempt fails identically, and the callback body has already run. `retry()` throws that
 * one immediately, with an explanation attached.
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
 * @param {string|string[]|RegExp} [options.errorMatch=['context or browser has been closed', 'Execution context was destroyed', "reading 'getOwnerBrowserWindow'"]] String(s) or regex to match against error message. If the error does not match, it will throw immediately. If it does match, it will retry.
 * @param {boolean} [options.disable=false] If true, only call the function once. See {@link RetryOptions.disable}.
 * @returns {Promise<T>} A promise that resolves with the result of the function or rejects with an error or timeout message.
 *   With `disable: true` it can also resolve `undefined`, when a teardown error is swallowed.
 */
export async function retry<T>(
  fn: () => Promise<T> | T,
  options: Partial<RetryOptions> & { disable: true },
): Promise<T | undefined>
export async function retry<T>(
  fn: () => Promise<T> | T,
  options?: Partial<RetryOptions>,
): Promise<T>
export async function retry<T>(
  fn: () => Promise<T> | T,
  options: Partial<RetryOptions> = {},
): Promise<T | undefined> {
  // the destructuring defaults matter: an explicit `undefined` in `options` (or in a
  // previous setRetryOptions() call) overwrites the merged value, and falling back to
  // the built-in default beats treating "no matcher" as either match-all or match-none
  const {
    poll = retryDefaults.poll,
    timeout = retryDefaults.timeout,
    errorMatch = retryDefaults.errorMatch,
    disable = retryDefaults.disable,
  } = {
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
    if (disable) return false
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
      if (!errorMatches(errString, errorMatch)) {
        // it's not a matching error, throw immediately - but a garbage-collected
        // promise deserves an explanation, since its message names the symptom
        // rather than the cause
        if (errorMatches(errString, gcErrorMatch)) {
          throw explainGcError(err, errString)
        }
        throw err
      }
      if (!shouldContinue()) {
        if (disable) {
          if (errorMatches(errString, teardownErrorMatch)) {
            // the action fired and then destroyed the context which would have
            // returned its result - there's nothing left to report
            return
          }
          // any other matching error - only reachable through a custom
          // errorMatch - means we don't know whether the action happened.
          // Throw rather than silently reporting success.
          throw err
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
  errorMatch: [...teardownErrorMatch],
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
 * - disable: false
 * - poll: 200
 * - timeout: 5000
 * - errorMatch: ['context or browser has been closed', 'Execution context was destroyed',
 *   "reading 'getOwnerBrowserWindow'"]
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
  /** If true, each try calls the function only once instead of retrying. See {@link RetryOptions.disable}. */
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
 * @param {number} [options.timeout=5000] - The maximum time in milliseconds to keep retrying the function. Defaults to 5000ms.
 * @param {number} [options.poll=100] - The delay between each retry attempt in milliseconds. Defaults to 100ms.
 * @param {number} [options.retryTimeout=5000] - The maximum time in milliseconds to wait for an individual try to return a result. Defaults to 5000ms.
 * @param {number} [options.retryPoll=200] - The delay between each retry attempt in milliseconds. Defaults to 200ms.
 * @param {string|string[]|RegExp} [options.retryErrorMatch] - The error message or pattern to match against. Errors that don't match will throw immediately.
 * @returns {Promise<T>} - A promise that resolves to the truthy value returned by the function.
 * @throws {Error} - Throws an error if the timeout is reached before a truthy value is returned.
 */
export async function retryUntilTruthy<T>(
  fn: () => Promise<T> | T,
  options: Partial<RetryUntilTruthyOptions> = {},
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
    // JSON.stringify() returns undefined - not a string - for undefined,
    // functions and symbols, and every caller expects a string back
    const json = JSON.stringify(err)
    return json === undefined ? String(err) : json
  }
}

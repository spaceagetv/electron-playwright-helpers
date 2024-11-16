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
  /** The number of times to retry before failing */
  retries?: number
  /** The delay between each retry attempt in milliseconds */
  intervalMs?: number
  /** The maximum time to wait before giving up (in milliseconds) */
  timeoutMs?: number
  /**
   * The error message or pattern to match against. Errors that don't match will throw immediately.
   * If a string or array of strings, the error will throw if it does not contain (one of) the passed string(s).
   * If a RegExp, the error will throw if it does not match the pattern.
   */
  errorMatch?: string | string[] | RegExp
}

/**
 * Retries a function until it returns without throwing an error containing a specific message.
 *
 * @category Utilities
 *
 * @template T The type of the value returned by the function.
 * @param {Function} fn The function to retry.
 * @param {RetryOptions} [options={}] The options for retrying the function.
 * @param {number} [options.retries=5] The number of retry attempts.
 * @param {number} [options.intervalMs=200] The delay between each retry attempt in milliseconds.
 * @param {number} [options.timeoutMs=5000] The maximum time to wait before giving up in milliseconds.
 * @param {string|RegExp} [options.errorMatch=['context or browser has been closed', 'Promise was collected']] The error message or pattern to match against.
 * @returns {Promise<T>} A promise that resolves with the result of the function or rejects with an error or timeout message.
 */
export async function retry<T>(
  fn: () => Promise<T> | T,
  options: RetryOptions = {}
): Promise<T> {
  const { retries, intervalMs, timeoutMs, errorMatch } = {
    ...getRetryOptions(),
    ...options,
  }
  let counter = 0
  const startTime = Date.now()

  while (counter < retries) {
    counter++
    try {
      return await fn()
    } catch (err) {
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
        throw err
      }
      if (counter >= retries) {
        throw err
      }
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout after ${timeoutMs}ms`)
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
}

const retryDefaults: RetryOptions = {
  retries: 5,
  intervalMs: 200,
  timeoutMs: 5000,
  errorMatch: ['context or browser has been closed', 'Promise was collected'],
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
  return retryDefaults
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
 * - retries: 5
 * - intervalMs: 200
 * - timeoutMs: 5000
 * - errorMatch: 'context or browser has been closed'
 *
 * @category Utilities
 */
export function resetRetryOptions(): void {
  Object.assign(currentRetryOptions, retryDefaults)
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
  if (
    typeof err === 'object' &&
    err &&
    'toString' in err &&
    typeof err.toString === 'function'
  ) {
    // this should catch Errors and other objects with a toString method
    return err.toString()
  } else if (typeof err === 'string') {
    return err
  } else {
    return JSON.stringify(err)
  }
}

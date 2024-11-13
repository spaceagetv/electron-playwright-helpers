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
  retries?: number
  intervalMs?: number
  timeoutMs?: number
}

/**
 * Retries a function until it returns without throwing an error.
 *
 * @category Utilities
 *
 * @template T The type of the value returned by the function.
 * @param {Function} fn The function to retry.
 * @param {RetryOptions} [options={}] The options for retrying the function.
 * @param {number} [options.retries=5] The number of retry attempts.
 * @param {number} [options.intervalMs=200] The delay between each retry attempt in milliseconds.
 * @param {number} [options.timeoutMs=5000] The maximum time to wait before giving up in milliseconds.
 * @returns {Promise<T>} A promise that resolves with the result of the function or rejects with an error or timeout message.
 */
export function retry<T>(
  fn: () => Promise<T> | T,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 5, intervalMs = 200, timeoutMs = 5000 } = options
  let timeout: NodeJS.Timeout
  const retry = new Promise<T>((resolve, reject) => {
    let attempts = 0

    timeout = setTimeout(() => {
      reject(new Error(`retry()::timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    const tryFn = async () => {
      try {
        attempts++
        const result = await fn()
        resolve(result)
      } catch (error) {
        if (attempts >= retries) {
          reject(error)
        } else {
          setTimeout(tryFn, intervalMs)
        }
      }
    }

    tryFn()
  })
  retry.finally(() => clearTimeout(timeout))
  return retry
}

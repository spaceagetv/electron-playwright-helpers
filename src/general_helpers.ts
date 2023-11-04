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
  while (!(await electronApp.evaluate(fn, arg))) {
    // wait 100ms before trying again
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

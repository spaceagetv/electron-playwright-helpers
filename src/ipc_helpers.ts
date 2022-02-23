import type { IpcMainInvokeEvent } from 'electron'
import { ElectronApplication, Page } from 'playwright'

/**
 * Send an `ipcRenderer.send()` (to main process) from a given window.
 *
 * Note: nodeIntegration must be true and contextIsolation must be false
 * in the webPreferences for this BrowserWindow.
 *
 * @category IPCRenderer
 *
 * @param page {Page} the Playwright Page to send the ipcRenderer.send() from
 * @param channel {string} the channel to send the ipcRenderer.send() to
 * @param args {...unknown} one or more arguments to send to the `ipcRenderer.send()`
 * @returns {Promise<unknown>}
 * @fulfil {unknown} resolves with the result of `ipcRenderer.send()`
 */
export function ipcRendererSend(
  window: Page,
  channel: string,
  ...args: unknown[]
): Promise<unknown> {
  return window.evaluate(
    ({ channel, args }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron')
      return ipcRenderer.send(channel, ...args)
    },
    { channel, args }
  )
}

/**
 * Send an ipcRenderer.invoke() from a given window.
 *
 * Note: nodeIntegration must be true and contextIsolation must be false
 * in the webPreferences for this window
 *
 * @category IPCRenderer
 *
 * @param page {Page} the Playwright Page to send the ipcRenderer.invoke() from
 * @param message {string} the channel to send the ipcRenderer.invoke() to
 * @param args {...unknown} one or more arguments to send to the ipcRenderer.invoke()
 * @returns {Promise<unknown>}
 * @fulfil {unknown} resolves with the result of ipcRenderer.invoke()
 */
export function ipcRendererInvoke(
  window: Page,
  message: string,
  ...args: unknown[]
): Promise<unknown> {
  return window.evaluate(
    async ({ message, args }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron')
      return await ipcRenderer.invoke(message, ...args)
    },
    { message, args }
  )
}

/**
 * Call just the first listener for a given ipcRenderer channel in a given window.
 * *UNLIKE MOST Electron ipcRenderer listeners*, this function SHOULD return a value.
 *
 * This function does not send data between main and renderer processes.
 * It simply retrieves data from the renderer process.
 *
 * Note: nodeIntegration must be true for this BrowserWindow.
 *
 * @category IPCRenderer
 *
 * @param window {Page} The Playwright Page to with the `ipcRenderer.on()` listener
 * @param message {string} The channel to call the first listener for
 * @param args {...unknown} optional - One or more arguments to send to the ipcRenderer.on() listener
 * @returns {Promise<unknown>}
 * @fulfil {unknown} the result of the first `ipcRenderer.on()` listener
 */
export async function ipcRendererCallFirstListener(
  window: Page,
  message: string,
  ...args: unknown[]
): Promise<unknown> {
  const result = await window.evaluate(
    async ({ message, args }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron')
      if (ipcRenderer.listenerCount(message) > 0) {
        // we send null in place of the ipcMain event object
        // also, we await in case the listener returns a promise
        return await ipcRenderer.listeners(message)[0](null, ...args)
      } else {
        throw new Error(`No ipcRenderer listeners for '${message}'`)
      }
    },
    { message, args }
  )
  // console.log(`ipcRendererCallFirstListener(${message}) result: ${result} `)
  return result
}

/**
 * Emit an IPC event to a given window.
 * This will trigger all ipcRenderer listeners for the event.
 *
 * This does not transfer data between main and renderer processes.
 * It simply emits an event in the renderer process.
 *
 * Note: nodeIntegration must be true for this window
 *
 * @category IPCRenderer
 *
 * @param window {Page} - the Playwright Page to with the ipcRenderer.on() listener
 * @param message {string} - the channel to call all ipcRenderer listeners for
 * @param args {...unknown} optional - one or more arguments to send
 * @returns {Promise<boolean>}
 * @fulfil {boolean} true if the event was emitted
 * @reject {Error} if there are no ipcRenderer listeners for the event
 */
export function ipcRendererEmit(
  window: Page,
  message: string,
  ...args: unknown[]
): Promise<boolean> {
  return window.evaluate(
    ({ message, args }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron')
      if (ipcRenderer.listenerCount(message) === 0) {
        throw new Error(`No ipcRenderer listeners for '${message}'`)
      }
      // create a fake event object
      const event = {} as Electron.IpcRendererEvent
      return ipcRenderer.emit(message, event, ...args)
    },
    { message, args }
  )
}

/**
 * Emit an ipcMain message from the main process.
 * This will trigger all ipcMain listeners for the event.
 *
 * This does not transfer data between main and renderer processes.
 * It simply emits an event in the main process.
 *
 * @category IPCMain
 *
 * @param electronApp {ElectronApplication} - the ElectronApplication object from Playwright
 * @param message {string} - the channel to call all ipcMain listeners for
 * @param args {...unknown} - one or more arguments to send
 * @returns {Promise<boolean>}
 * @fulfil {boolean} true if there were listeners for this message
 * @reject {Error} if there are no ipcMain listeners for the event
 */
export function ipcMainEmit(
  electronApp: ElectronApplication,
  message: string,
  ...args: unknown[]
): Promise<boolean> {
  return electronApp.evaluate(
    ({ ipcMain }, { message, args }) => {
      if (ipcMain.listeners(message).length > 0) {
        // we send null in place of the ipcMain event object
        return ipcMain.emit(message, null, ...args)
      } else {
        throw new Error(`No ipcMain listeners for '${message}'`)
      }
    },
    { message, args }
  )
}

/**
 * Call the first listener for a given ipcMain message in the main process
 * and return its result.
 *
 * NOTE: ipcMain listeners usually don't return a value, but we're using
 * this to retrieve test data from the main process.
 *
 * Generally, it's probably better to use `ipcMainInvokeHandler()` instead.
 *
 * @category IPCMain
 *
 * @param electronApp {ElectronApplication} - the ElectronApplication object from Playwright
 * @param message {string} - the channel to call the first listener for
 * @param args {...unknown} - one or more arguments to send
 * @returns {Promise<unknown>}
 * @fulfil {unknown} resolves with the result of the function
 * @reject {Error} if there are no ipcMain listeners for the event
 */
export async function ipcMainCallFirstListener(
  electronApp: ElectronApplication,
  message: string,
  ...args: unknown[]
): Promise<unknown> {
  return await electronApp.evaluate(
    async ({ ipcMain }, { message, args }) => {
      if (ipcMain.listenerCount(message) > 0) {
        return await ipcMain.listeners(message)[0](...args)
      } else {
        throw new Error(`No listeners for message ${message}`)
      }
    },
    { message, args }
  )
}

/** Expose type for private _invokeHandlers Map */
type IpcMainWithHandlers = Electron.IpcMain & {
  _invokeHandlers: Map<
    string,
    (e: IpcMainInvokeEvent, ...args: unknown[]) => void
  >
}

/**
 * Get the return value of an `ipcMain.handle()` function
 *
 * @category IPCMain
 *
 * @param electronApp {ElectronApplication} - the ElectronApplication object from Playwright
 * @param message {string} - the channel to call the first listener for
 * @param args {...unknown} - one or more arguments to send
 * @returns {Promise<unknown>}
 * @fulfil {unknown} resolves with the result of the function called in main process
 */
export function ipcMainInvokeHandler(
  electronApp: ElectronApplication,
  message: string,
  ...args: unknown[]
) {
  return electronApp.evaluate(
    ({ ipcMain }, { message, args }) => {
      const ipcMainWH = ipcMain as IpcMainWithHandlers
      const handler = ipcMainWH._invokeHandlers.get(message)
      if (handler) {
        const fakeEvent = {} as Electron.IpcMainInvokeEvent
        return handler(fakeEvent, ...args)
      } else {
        throw new Error(`No ipcMain handler registered for '${message}'`)
      }
    },
    { message, args }
  )
}

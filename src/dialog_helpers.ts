import { ElectronApplication } from 'playwright'

export type DialogMethodStub<T extends keyof Electron.Dialog> = {
  method: T
  value: Awaited<ReturnType<Electron.Dialog[T]>>
}

export type DialogMethodStubPartial<T extends keyof Electron.Dialog> = {
  method: T
  value: Partial<Awaited<ReturnType<Electron.Dialog[T]>>>
}

type DialogDefaults = {
  [K in keyof Electron.Dialog]: Awaited<ReturnType<Electron.Dialog[K]>>
}

const dialogDefaults: DialogDefaults = {
  showCertificateTrustDialog: undefined,
  showErrorBox: undefined,
  showMessageBox: {
    response: 0,
    checkboxChecked: false,
  },
  showMessageBoxSync: 0,
  showOpenDialog: {
    filePaths: [],
    canceled: false,
  },
  showOpenDialogSync: [],
  showSaveDialog: {
    filePath: undefined,
    canceled: false,
  },
  showSaveDialogSync: undefined,
}

/**
 * Stub a single dialog method. This is a convenience function that calls `stubMultipleDialogs`
 * for a single method.
 *
 * Playwright does not have a way to interact with Electron dialog windows,
 * so this function allows you to substitute the dialog module's methods during your tests.
 * By stubbing the dialog module, your Electron application will not display any dialog windows,
 * and you can control the return value of the dialog methods. You're basically saying
 * "when my application calls dialog.showOpenDialog, return this value instead". This allows you
 * to test your application's behavior when the user selects a file, or cancels the dialog, etc.
 *
 * Note: Each dialog method can only be stubbed with one value at a time, so you will want to call
 * `stubDialog` before each time that you expect your application to call the dialog method.
 *
 * @example
 * ```ts
 * await stubDialog(app, 'showOpenDialog', {
 *  filePaths: ['/path/to/file'],
 *  canceled: false,
 * })
 * await clickMenuItemById(app, 'open-file')
 * // when time your application calls dialog.showOpenDialog,
 * // it will return the value you specified
 * ```
 *
 * @see stubMultipleDialogs
 *
 * @category Dialog
 *
 * @param app {ElectronApplication} The Playwright ElectronApplication instance.
 * @param method {String} The [dialog method](https://www.electronjs.org/docs/latest/api/dialog#methods) to mock.
 * @param value {ReturnType<Electron.Dialog>} The value that your application will receive when calling this dialog method.
 *   See the [Electron docs](https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options) for
 *   the return value of each method.
 * @returns {Promise<void>} A promise that resolves when the mock is applied.
 * @fullfil {void} - A promise that resolves when the mock is applied.
 *
 */
export function stubDialog<T extends keyof Electron.Dialog>(
  app: ElectronApplication,
  method: T,
  value?: Partial<Awaited<ReturnType<Electron.Dialog[T]>>>
) {
  if (!value) value = dialogDefaults[method]
  return stubMultipleDialogs(app, [{ method, value }])
}

/**
 * Stub methods of the Electron dialog module.
 *
 * Playwright does not have a way to interact with Electron dialog windows,
 * so this function allows you to mock the dialog module's methods during your tests.
 * By mocking the dialog module, your Electron application will not display any dialog windows,
 * and you can control the return value of the dialog methods. You're basically saying
 * "when my application calls dialog.showOpenDialog, return this value instead". This allows you
 * to test your application's behavior when the user selects a file, or cancels the dialog, etc.
 *
 * @example
 * ```ts
 * await stubMultipleDialogs(app, [
 *  {
 *    method: 'showOpenDialog',
 *    value: {
 *      filePaths: ['/path/to/file1', '/path/to/file2'],
 *      canceled: false,
 *    },
 *  },
 *  {
 *     method: 'showSaveDialog',
 *     value: {
 *       filePath: '/path/to/file',
 *       canceled: false,
 *     },
 *   },
 * ])
 * await clickMenuItemById(app, 'save-file')
 * // when your application calls dialog.showSaveDialog,
 * // it will return the value you specified
 * ```
 *
 * @category Dialog
 *
 * @param app {ElectronApplication} The Playwright ElectronApplication instance.
 * @param mocks {DialogMethodStubPartial[]} An array of dialog method mocks to apply.
 * @returns {Promise<void>} A promise that resolves when the mocks are applied.
 * @fullfil {void} - A promise that resolves when the mocks are applied.
 */
export function stubMultipleDialogs<T extends keyof Electron.Dialog>(
  app: ElectronApplication,
  mocks: DialogMethodStubPartial<T>[]
) {
  const mocksRequired = mocks.map((mock) => {
    const methodDefault = dialogDefaults[mock.method]
    if (!methodDefault) return mock as DialogMethodStub<T>
    if (typeof mock.value === 'object') {
      mock.value = Object.assign({}, methodDefault, mock.value)
    } else {
      mock.value = mock.value ?? methodDefault
    }
    return mock as DialogMethodStub<T>
  })

  // idea from https://github.com/microsoft/playwright/issues/8278#issuecomment-1009957411 by @MikeJerred
  return app.evaluate(({ dialog }, mocks) => {
    mocks.forEach((mock: DialogMethodStub<keyof Electron.Dialog>) => {
      const thisDialog = dialog[mock.method]
      if (!thisDialog) {
        throw new Error(`can't find ${mock.method} on dialog module.`)
      }
      if (mock.method.endsWith('Sync')) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        dialog[mock.method] = () => {
          // console.log(`Dialog.${v.method}(${args.join(', ')})`)
          return mock.value
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        dialog[mock.method] = async () => {
          // console.log(`Dialog.${v.method}(${args.join(', ')})`)
          return mock.value
        }
      }
    })
  }, mocksRequired)
}

/**
 * Stub all dialog methods. This is a convenience function that calls `stubMultipleDialogs`
 * for all dialog methods. This is useful if you want to ensure that dialogs are not displayed
 * during your tests. However, you may want to use `stubDialog` or `stubMultipleDialogs` to
 * control the return value of specific dialog methods (e.g. `showOpenDialog`) during your tests.
 *
 * @see stubDialog
 *
 * @category Dialog
 *
 * @param app {ElectronApplication} The Playwright ElectronApplication instance.
 * @returns {Promise<void>} A promise that resolves when the mocks are applied.
 * @fullfil {void} - A promise that resolves when the mocks are applied.
 */
export function stubAllDialogs(app: ElectronApplication) {
  // reformat the dialogDefaults object into the format that stubMultipleDialogs expects
  const stubMultipleDialogsArgs = []
  for (const [method, value] of Object.entries(dialogDefaults)) {
    stubMultipleDialogsArgs.push({ method, value })
  }
  return stubMultipleDialogs(
    app,
    stubMultipleDialogsArgs as DialogMethodStubPartial<keyof Electron.Dialog>[]
  )
}

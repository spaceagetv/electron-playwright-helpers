/**
 * Example Playwright script for Electron
 * showing/testing various API features
 * in both renderer and main processes
 */

import { expect, test } from '@playwright/test'

// We're importing the library from the root of the project,
// but if you use this in your own project, you should
// import from 'electron-playwright-helpers'
import {
  addTimeout,
  clickMenuItem,
  clickMenuItemById,
  findLatestBuild,
  findMenuItem,
  getApplicationMenu,
  getMenuItemAttribute,
  getMenuItemById,
  getWindowByMatcher,
  getWindowByTitle,
  getWindowByUrl,
  ipcMainCallFirstListener,
  ipcMainEmit,
  ipcMainInvokeHandler,
  ipcRendererCallFirstListener,
  ipcRendererEmit,
  ipcRendererInvoke,
  ipcRendererSend,
  isSerializedNativeImageSuccess,
  isSerializedNativeImageError,
  parseElectronApp,
  retryUntilTruthy,
  stubDialog,
  stubDialogMatchers,
  waitForMenuItemStatus,
  waitForWindowByMatcher,
  waitForWindowByTitle,
  waitForWindowByUrl,
} from '../../src' // <-- replace with 'electron-playwright-helpers'

import { Page, _electron as electron } from '../../node_modules/playwright-core' // <-- replace with 'playwright-core'
import { getApp, setApp } from './app-manager'

export function latestPage(): Page | undefined {
  const windows = getApp()?.windows()
  return windows?.[windows.length - 1]
}

test.beforeAll(async () => {
  // find the latest build in the out directory
  const latestBuild = findLatestBuild()
  expect(latestBuild).toBeTruthy()

  // parse the directory and find paths and other info
  const appInfo = parseElectronApp(latestBuild)

  // a little testing of parseElectronApp()
  // for testing electron-playwright-helpers... you probably won't need this in your own tests
  // --------- >8 cut here -------------------
  expect(appInfo).toBeTruthy()
  expect(appInfo.arch).toBeTruthy()
  expect(appInfo.arch).toBe(process.arch)
  expect(appInfo.asar).toBe(true)
  expect(appInfo.executable).toBeTruthy()
  expect(appInfo.main).toBeTruthy()
  expect(appInfo.name).toBe('electron-playwright-helpers-example')
  expect(appInfo.packageJson).toBeTruthy()
  expect(appInfo.packageJson.name).toBe('electron-playwright-helpers-example')
  expect(appInfo.platform).toBeTruthy()
  expect(appInfo.platform).toBe(process.platform)
  expect(appInfo.resourcesDir).toBeTruthy()
  // --------- >8 cut here -------------------

  // set the CI environment variable to true
  process.env.CI = 'e2e'
  const electronApp = await electron.launch({
    args: [
      appInfo.main,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu-sandbox',
    ],
    executablePath: appInfo.executable,
  })
  electronApp.on('console', (msg) => {
    console.log(msg.text())
  })
  setApp(electronApp)
  electronApp.on('window', async (page) => {
    const filename = page.url()?.split('/').pop()
    console.log(`Window opened: ${filename}`)

    // capture errors
    page.on('pageerror', (error) => {
      console.error(error)
    })
    // capture console messages
    page.on('console', (msg) => {
      console.log(msg.text())
    })
  })
})

test.afterAll(() => {
  getApp()?.close()
})

test('renders the first page', async () => {
  const page = await getApp().firstWindow()
  await page.waitForSelector('h1')
  const text = await page.$eval('h1', (el) => el.textContent)
  expect(text).toBe('Hello World!')
  const title = await page.title()
  expect(title).toBe('Window 1')
})

test(`"create new window" button exists`, async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  expect(await page.$('#new-window')).toBeTruthy()
})

test('click the button to open new window', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  await page.click('#new-window')
  const newPage = await getApp().waitForEvent('window')
  expect(newPage).toBeTruthy()
})

test('window 2 has correct title', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  const title = await page.title()
  expect(title).toBe('Window 2')
})

test('trigger IPC listener via main process', async () => {
  const electronApp = getApp()
  electronApp.evaluate(({ ipcMain }) => {
    ipcMain.emit('new-window')
  })
  const newPage = await electronApp.waitForEvent('window')
  expect(newPage).toBeTruthy()
  expect(await newPage.title()).toBe('Window 3')
})

test('send IPC message from renderer', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  // evaluate this script in render process
  // requires webPreferences.nodeIntegration true and contextIsolation false
  await ipcRendererSend(page, 'new-window')
  const newPage = await getApp().waitForEvent('window')
  expect(newPage).toBeTruthy()
  expect(await newPage.title()).toBe('Window 4')
})

test('send an ipcRenderer.invoke() message and receive result', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  // evaluate this script in RENDERER process and collect the result
  const result = await ipcRendererInvoke(page, 'how-many-windows')
  expect(result).toBe(4)
})

test('get data from a ipcMain.handle() function in main', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  // evaluate this script in MAIN process and collect the result
  const result = await ipcMainInvokeHandler(getApp(), 'how-many-windows')
  expect(result).toBe(4)
})

test('error when calling a non-existent ipcMain.handle() channel', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  // await expect(
  //   ipcMainInvokeHandler(getApp(), 'non-existent-channel')
  // ).rejects.toThrow()
  try {
    await ipcMainInvokeHandler(getApp(), 'non-existent-channel')
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain(`No ipcMain handler registered`)
  }
})

test('receive synchronous data via ipcRendererCallFirstListener()', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  const data = await ipcRendererCallFirstListener(page, 'get-synchronous-data')
  expect(data).toBe('Synchronous Data')
})

test('receive asynchronous data via ipcRendererCallFirstListener()', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  const data = await ipcRendererCallFirstListener(page, 'get-asynchronous-data')
  expect(data).toBe('Asynchronous Data')
})

test('receive asynchronous data via addTimeout(`ipcRendererCallFirstListener`)', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  const data = await addTimeout(
    'ipcRendererCallFirstListener',
    3000,
    'timeout for ipcRendererCallFirstListener()',
    page,
    'get-asynchronous-data',
    [],
    3000
  )
  expect(data).toBe('Asynchronous Data')
})

test('throw error via ipcRendererCallFirstListener with bogus channel', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  try {
    await ipcRendererCallFirstListener(page, 'bogus-channel')
      .then(() => {
        throw new Error(
          'ipcRendererCallFirstListener should have thrown an error'
        )
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error)
        expect((err as Error).message).toContain(
          `No ipcRenderer listeners for 'bogus-channel'`
        )
      })
  } catch (error) {
    console.log(JSON.stringify(error))
  }
})

test('throw error via ipcRendererCallFirstListener with bogus page', async () => {
  const page = {} as Page
  await expect(
    ipcRendererCallFirstListener(page, 'get-asynchronous-data')
  ).rejects.toThrow()
})

test('send an ipcRendererEmit.emit() message and expect element to appear', async () => {
  const page = latestPage()
  if (!page) {
    throw new Error('No page found')
  }
  // evaluate this script in RENDERER process
  await ipcRendererEmit(page, 'add-message', 'Goodbye World!', 'message-1')
  const locator = page.locator('#message-1')
  await locator.waitFor({ state: 'attached' })
  const text = await locator.textContent()
  expect(text).toBe('Goodbye World!')
  expect(await locator.isVisible()).toBeTruthy()
})

test('receive synchronous data via ipcMainCallFirstListener()', async () => {
  const data = await ipcMainCallFirstListener(getApp(), 'main-synchronous-data')
  expect(data).toBe('Main Synchronous Data')
})

test('receive asynchronous data via ipcMainCallFirstListener()', async () => {
  const data = await ipcMainCallFirstListener(
    getApp(),
    'main-asynchronous-data'
  )
  expect(data).toBe('Main Asynchronous Data')
})

test('send an ipcMainEmit.emit() message and expect window to open', async () => {
  const electronApp = getApp()
  // evaluate this script in MAIN process
  const [newPage] = await Promise.all([
    electronApp.waitForEvent('window'),
    ipcMainEmit(electronApp, 'new-window'),
  ])
  expect(newPage).toBeTruthy()
  expect(await newPage.title()).toBe('Window 5')
})

test('get the entire application menu', async () => {
  const electronApp = getApp()
  const menu = await getApplicationMenu(electronApp)
  expect(menu).toBeTruthy()
  if (!menu) return
  expect(menu).toBeTruthy()
  expect(Array.isArray(menu)).toBeTruthy()
  expect(menu.length).toBeGreaterThan(2)
  // to see the whole menu, uncomment this line
  // console.log(JSON.stringify(menu, null, 2))
})

test('find a menu item by id using `findMenuItem()`', async () => {
  const electronApp = getApp()
  const menuItem = await findMenuItem(electronApp, 'id', 'new-window')
  expect(menuItem).toBeTruthy()
  if (!menuItem) return
  expect(menuItem.label).toBe('New Window')
  expect(menuItem.enabled).toBe(true)
})

test('find a menu item by label using `findMenuItem()`', async () => {
  const electronApp = getApp()
  const menuItem = await findMenuItem(electronApp, 'label', 'New Window')
  expect(menuItem).toBeTruthy()
  if (!menuItem) return
  expect(menuItem.id).toBe('new-window')
  expect(menuItem.enabled).toBe(true)
})

test('find a menu item by role using `findMenuItem()`', async () => {
  const electronApp = getApp()
  const menuItem = await findMenuItem(electronApp, 'role', 'zoomIn')
  expect(menuItem).toBeTruthy()
  if (!menuItem) return
  expect(menuItem.enabled).toBe(true)
  expect(menuItem.visible).toBe(true)
  // this will fail in non-English locales
  expect(menuItem.label).toBe('Zoom In')
})

test('select the checkbox menuItem and watch its status change', async () => {
  const electronApp = getApp()
  const checkboxBefore = await getMenuItemById(electronApp, 'checkbox')
  expect(checkboxBefore).toBeTruthy()
  if (!checkboxBefore) return
  expect(checkboxBefore.checked).toBe(false)
  await Promise.all([
    waitForMenuItemStatus(electronApp, 'checkbox', 'checked', true),
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      clickMenuItemById(electronApp, 'checkbox')
    })(),
  ])
  const nowChecked = await getMenuItemAttribute(
    electronApp,
    'checkbox',
    'checked'
  )
  expect(nowChecked).toBe(true)
})

test('select a menu item via the main process', async () => {
  const electronApp = getApp()
  await clickMenuItemById(electronApp, 'new-window')
  const newPage = await electronApp.waitForEvent('window')
  expect(newPage).toBeTruthy()
  expect(await newPage.title()).toBe('Window 6')
})

test('click a menu item by its commandId', async () => {
  const electronApp = getApp()
  const menuItem = await findMenuItem(electronApp, 'id', 'new-window')
  expect(menuItem).toBeTruthy()
  if (!menuItem) return
  await clickMenuItem(electronApp, 'commandId', menuItem.commandId)
  const newPage = await electronApp.waitForEvent('window')
  expect(newPage).toBeTruthy()
  expect(await newPage.title()).toBe('Window 7')
})

test('click a menu item based on its label', async () => {
  const electronApp = getApp()
  await clickMenuItem(electronApp, 'label', 'New Window')
  const newPage = await electronApp.waitForEvent('window')
  expect(newPage).toBeTruthy()
  expect(await newPage.title()).toBe('Window 8')
})

test('dialog.showOpenDialog stubbing', async () => {
  const app = getApp()
  await stubDialog(app, 'showOpenDialog', {
    filePaths: ['/path/to/file.txt'],
    canceled: false,
  })
  // get the currently "opened" file path
  const filePath = await ipcMainInvokeHandler(app, 'get-opened-file')
  expect(filePath).not.toBe('/path/to/file.txt')
  // open a file (and call the mocked dialog)
  await clickMenuItemById(app, 'open-file')
  // get the currently "opened" file path
  const filePath2 = await ipcMainInvokeHandler(app, 'get-opened-file')
  expect(filePath2).toBe('/path/to/file.txt')
})

test('dialog.showMessageBox stubbing', async () => {
  const app = getApp()
  await stubDialog(app, 'showMessageBox', {
    response: 0, // The "Yes" button
  })
  // get the currently "opened" file path
  const response = await ipcMainInvokeHandler(app, 'get-opened-file')
  expect(response).not.toBe('')
  // select the "Close File" menu item, which will call the mocked dialog
  await clickMenuItemById(app, 'close-file')
  // get the currently "opened" file path
  const response2 = await ipcMainInvokeHandler(app, 'get-opened-file')
  expect(response2).toBe('')
})

test('dialog.showSaveDialog stubbing', async () => {
  const app = getApp()
  await stubDialog(app, 'showOpenDialog', {
    filePaths: ['/path/to/file.txt'],
    canceled: false,
  })
  // open a file (and call the mocked dialog)
  await clickMenuItemById(app, 'open-file')
  // get the currently "opened" file path
  const filePath = await ipcMainInvokeHandler(app, 'get-opened-file')
  expect(filePath).not.toBe('/path/to/new-saved-file.txt')

  await stubDialog(app, 'showSaveDialog', {
    filePath: '/path/to/new-saved-file.txt',
  })
  // select the "Save File" menu item, which will call the mocked dialog
  // no dialog should appear, but the file path should be updated
  await clickMenuItemById(app, 'save-file')

  // get the currently "opened" file path
  const filePath2 = await ipcMainInvokeHandler(app, 'get-opened-file')
  expect(filePath2).toBe('/path/to/new-saved-file.txt')
})

test('skull menu item with nativeImage is properly serialized', async () => {
  const electronApp = getApp()

  // Get the skull menu item by ID
  const skullMenuItem = await getMenuItemById(electronApp, 'skull-menu-item')
  expect(skullMenuItem).toBeTruthy()
  if (!skullMenuItem) return

  // Check basic properties
  expect(skullMenuItem.label).toBe('Skull')
  expect(skullMenuItem.id).toBe('skull-menu-item')

  // Check that the nativeImage icon is properly serialized
  expect(skullMenuItem.icon).toBeTruthy()
  if (skullMenuItem.icon && typeof skullMenuItem.icon === 'object') {
    const iconData = skullMenuItem.icon
    expect(iconData.type).toBe('NativeImage')
    // Should have either a dataURL or an error message
    if (isSerializedNativeImageSuccess(iconData)) {
      // Success case - has dataURL, size, and isEmpty
      expect(iconData.dataURL).toBeTruthy()
      expect(iconData.dataURL).toMatch(/^data:image\//)
      expect(iconData.size).toBeTruthy()
      expect(typeof iconData.isEmpty).toBe('boolean')
      expect(iconData.isEmpty).toBe(false)
    } else if (isSerializedNativeImageError(iconData)) {
      // Error case - has error message
      expect(iconData.error).toBeTruthy()
      expect(typeof iconData.error).toBe('string')
    }
  }
})

test('click skull menu item', async () => {
  const electronApp = getApp()
  // This should work without throwing an error
  await clickMenuItemById(electronApp, 'skull-menu-item')
  // The click just logs to console, so we just verify it doesn't throw
})

test.describe('retryUntilTruthy()', () => {
  test('retryUntilTruthy() returns true', async () => {
    const page = latestPage()
    if (!page) {
      throw new Error('No page found')
    }
    const result = await retryUntilTruthy(() =>
      page.evaluate(() => document.getElementById('new-window'))
    )
    expect(result).toBeTruthy()
  })

  test('retryUntilTruthy() timeout when returning false', async () => {
    const page = latestPage()
    if (!page) {
      throw new Error('No page found')
    }
    await expect(
      retryUntilTruthy(
        () =>
          page.evaluate(() => document.getElementById('non-existent-element')),
        { timeout: 500 }
      )
    ).rejects.toThrow('Timeout after 500ms')
  })

  test('retryUntilTruthy() return truthy after a few iterations', async () => {
    const page = latestPage()
    if (!page) {
      throw new Error('No page found')
    }
    await expect(
      retryUntilTruthy(() =>
        page.evaluate(() => {
          const w = window as Window & { counter?: number }
          if (!w.counter) {
            w.counter = 0
          }
          w.counter++
          return w.counter > 3
        })
      )
    ).resolves.toBeTruthy()
  })
})

test('stress test: run electronApp.evaluate()', async () => {
  test.setTimeout(60000)
  const app = getApp()
  const iterations = 10000
  const startTime = Date.now()
  for (let i = 0; i < iterations; i++) {
    const displays = await app.evaluate(({ screen }) => screen.getAllDisplays())
    expect(displays).toBeTruthy()
    expect(displays.length).toBeGreaterThan(0)
  }
  console.log(`${iterations} iterations took ${Date.now() - startTime}ms`)
})

test.describe('Dialog Matchers', () => {
  test('stubDialogMatchers with exact string match on title', async () => {
    const app = getApp()

    // Set up matchers for different dialogs
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { title: 'Delete File' },
        value: { response: 1 }, // Click "Delete" button (index 1)
      },
      {
        method: 'showMessageBox',
        matcher: { title: 'Save Changes' },
        value: { response: 0 }, // Click "Save" button (index 0)
      },
    ])

    // Test the delete confirmation dialog
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(1) // Should have clicked "Delete"

    // Test the save changes dialog
    const saveResponse = await ipcMainInvokeHandler(
      app,
      'show-save-changes-dialog'
    )
    expect(saveResponse).toBe(0) // Should have clicked "Save"
  })

  test('stubDialogMatchers with regex match on title', async () => {
    const app = getApp()

    // Set up matchers using regex patterns
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { title: /delete/i }, // Case-insensitive regex
        value: { response: 0 }, // Click "Cancel" button (index 0)
      },
    ])

    // Test the delete confirmation dialog
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(0) // Should have clicked "Cancel"
  })

  test('stubDialogMatchers with message matcher', async () => {
    const app = getApp()

    // Set up matchers based on message content
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { message: /save your changes/i },
        value: { response: 2 }, // Click "Cancel" button (index 2)
      },
      {
        method: 'showMessageBox',
        matcher: { message: /delete this file/i },
        value: { response: 1 }, // Click "Delete" button (index 1)
      },
    ])

    // Test the save changes dialog
    const saveResponse = await ipcMainInvokeHandler(
      app,
      'show-save-changes-dialog'
    )
    expect(saveResponse).toBe(2) // Should have clicked "Cancel"

    // Test the delete confirmation dialog
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(1) // Should have clicked "Delete"
  })

  test('stubDialogMatchers with button text matcher', async () => {
    const app = getApp()

    // Match dialogs that have a specific button
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { buttons: /Don't Save/i },
        value: { response: 1 }, // Click "Don't Save" button (index 1)
      },
    ])

    // Test the save changes dialog (it has "Don't Save" button)
    const saveResponse = await ipcMainInvokeHandler(
      app,
      'show-save-changes-dialog'
    )
    expect(saveResponse).toBe(1) // Should have clicked "Don't Save"
  })

  test('stubDialogMatchers with type matcher', async () => {
    const app = getApp()

    // Match dialogs by their type
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { type: 'warning' },
        value: { response: 0 }, // Click "Cancel" for warning dialogs
      },
      {
        method: 'showMessageBox',
        matcher: { type: 'question' },
        value: { response: 2 }, // Click last button for question dialogs
      },
    ])

    // Test the delete confirmation dialog (type: 'warning')
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(0) // Should have clicked "Cancel"

    // Test the save changes dialog (type: 'question')
    const saveResponse = await ipcMainInvokeHandler(
      app,
      'show-save-changes-dialog'
    )
    expect(saveResponse).toBe(2) // Should have clicked "Cancel"
  })

  test('stubDialogMatchers with showOpenDialog matcher', async () => {
    const app = getApp()

    // Set up matchers for open dialogs
    await stubDialogMatchers(app, [
      {
        method: 'showOpenDialog',
        matcher: { title: 'Select Image' },
        value: {
          filePaths: ['/path/to/selected-image.png'],
          canceled: false,
        },
      },
    ])

    // Test the select image dialog
    const result = await ipcMainInvokeHandler(app, 'show-select-image-dialog')
    expect(result.canceled).toBe(false)
    expect(result.filePaths).toEqual(['/path/to/selected-image.png'])
  })

  test('stubDialogMatchers with showSaveDialog matcher', async () => {
    const app = getApp()

    // Set up matchers for save dialogs
    await stubDialogMatchers(app, [
      {
        method: 'showSaveDialog',
        matcher: { title: /export/i },
        value: {
          filePath: '/path/to/exported-file.txt',
          canceled: false,
        },
      },
    ])

    // Test the export dialog
    const result = await ipcMainInvokeHandler(app, 'show-export-dialog')
    expect(result.canceled).toBe(false)
    expect(result.filePath).toBe('/path/to/exported-file.txt')
  })

  test('stubDialogMatchers with multiple matchers for same method (first match wins)', async () => {
    const app = getApp()

    // Set up multiple matchers for showMessageBox
    // The first matching stub should win
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { title: 'Delete File' }, // More specific
        value: { response: 1 },
      },
      {
        method: 'showMessageBox',
        matcher: { type: 'warning' }, // Less specific (also matches Delete File)
        value: { response: 0 },
      },
    ])

    // The delete dialog matches both matchers, but the first one (title match) should win
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(1) // First matcher wins
  })

  test('stubDialogMatchers with combined matchers', async () => {
    const app = getApp()

    // Use multiple properties in a single matcher
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: {
          type: 'warning',
          title: /delete/i,
          detail: /cannot be undone/i,
        },
        value: { response: 1 }, // Click "Delete"
      },
    ])

    // The delete dialog matches all conditions
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(1)
  })

  test('stubDialogMatchers defaults when no matcher matches', async () => {
    const app = getApp()

    // Set up a matcher that won't match our dialog
    await stubDialogMatchers(app, [
      {
        method: 'showMessageBox',
        matcher: { title: 'Non-existent Dialog' },
        value: { response: 99 },
      },
    ])

    // The delete dialog doesn't match, so it should return default (response: 0)
    const deleteResponse = await ipcMainInvokeHandler(
      app,
      'show-delete-confirmation'
    )
    expect(deleteResponse).toBe(0) // Default response
  })

  test('stubDialogMatchers with throwOnUnmatched option', async () => {
    const app = getApp()

    // Set up matchers with throwOnUnmatched
    await stubDialogMatchers(
      app,
      [
        {
          method: 'showMessageBox',
          matcher: { title: 'Non-existent Dialog' },
          value: { response: 99 },
        },
      ],
      { throwOnUnmatched: true }
    )

    // The delete dialog doesn't match, so it should throw
    await expect(
      ipcMainInvokeHandler(app, 'show-delete-confirmation')
    ).rejects.toThrow(/No matching stub for showMessageBox/)
  })

  test('stubDialogMatchers with empty matcher (matches all)', async () => {
    const app = getApp()

    // An empty matcher should match any dialog of that method
    await stubDialogMatchers(app, [
      {
        method: 'showOpenDialog',
        matcher: {}, // Matches all open dialogs
        value: { filePaths: ['/catch-all-path.txt'], canceled: false },
      },
    ])

    // The select image dialog should match the catch-all
    const result = await ipcMainInvokeHandler(app, 'show-select-image-dialog')
    expect(result.filePaths).toEqual(['/catch-all-path.txt'])
  })

  test('stubDialogMatchers with buttonLabel matcher for open dialog', async () => {
    const app = getApp()

    await stubDialogMatchers(app, [
      {
        method: 'showOpenDialog',
        matcher: { buttonLabel: 'Select' },
        value: { filePaths: ['/selected-via-button-label.png'], canceled: false },
      },
    ])

    const result = await ipcMainInvokeHandler(app, 'show-select-image-dialog')
    expect(result.filePaths).toEqual(['/selected-via-button-label.png'])
  })
})

test.describe('Window Helpers', () => {
  test('getWindowByTitle finds a window by exact title substring', async () => {
    const app = getApp()
    const window = await getWindowByTitle(app, 'Window 1')
    expect(window).toBeTruthy()
    if (!window) return
    expect(await window.title()).toBe('Window 1')
  })

  test('getWindowByTitle finds a window by regex pattern', async () => {
    const app = getApp()
    const window = await getWindowByTitle(app, /Window \d+/)
    expect(window).toBeTruthy()
    if (!window) return
    expect(await window.title()).toMatch(/Window \d+/)
  })

  test('getWindowByTitle returns undefined for non-matching pattern', async () => {
    const app = getApp()
    const window = await getWindowByTitle(app, 'Non-existent Window')
    expect(window).toBeUndefined()
  })

  test('getWindowByTitle with all: true returns all matching windows', async () => {
    const app = getApp()
    const windows = await getWindowByTitle(app, /Window \d+/, { all: true })
    expect(Array.isArray(windows)).toBe(true)
    expect(windows.length).toBeGreaterThan(1)
    for (const window of windows) {
      expect(await window.title()).toMatch(/Window \d+/)
    }
  })

  test('getWindowByUrl finds a window by URL substring', async () => {
    const app = getApp()
    // All windows load index.html
    const window = await getWindowByUrl(app, 'index.html')
    expect(window).toBeTruthy()
  })

  test('getWindowByUrl finds a window by regex pattern', async () => {
    const app = getApp()
    const window = await getWindowByUrl(app, /index\.html/)
    expect(window).toBeTruthy()
  })

  test('getWindowByUrl with all: true returns all matching windows', async () => {
    const app = getApp()
    const windows = await getWindowByUrl(app, /index\.html/, { all: true })
    expect(Array.isArray(windows)).toBe(true)
    expect(windows.length).toBeGreaterThan(1)
  })

  test('getWindowByMatcher finds a window with custom matcher', async () => {
    const app = getApp()
    const window = await getWindowByMatcher(app, async (page) => {
      const title = await page.title()
      return title === 'Window 1'
    })
    expect(window).toBeTruthy()
    if (!window) return
    expect(await window.title()).toBe('Window 1')
  })

  test('getWindowByMatcher with all: true returns all matching windows', async () => {
    const app = getApp()
    const windows = await getWindowByMatcher(
      app,
      async (page) => {
        const title = await page.title()
        return title.startsWith('Window')
      },
      { all: true }
    )
    expect(Array.isArray(windows)).toBe(true)
    expect(windows.length).toBeGreaterThan(1)
  })

  test('waitForWindowByTitle waits for a new window to appear', async () => {
    const app = getApp()
    const currentCount = app.windows().length

    // Start waiting for the window before triggering its creation
    const [newWindow] = await Promise.all([
      waitForWindowByTitle(app, `Window ${currentCount + 1}`, { timeout: 5000 }),
      clickMenuItemById(app, 'new-window'),
    ])

    expect(newWindow).toBeTruthy()
    expect(await newWindow.title()).toBe(`Window ${currentCount + 1}`)
  })

  test('waitForWindowByUrl waits for a new window to appear', async () => {
    const app = getApp()
    const currentCount = app.windows().length

    // Start waiting for the window before triggering its creation
    const [newWindow] = await Promise.all([
      waitForWindowByUrl(app, 'index.html', { timeout: 5000 }),
      (async () => {
        // Small delay to ensure waitForWindowByUrl is listening
        await new Promise((resolve) => setTimeout(resolve, 100))
        await clickMenuItemById(app, 'new-window')
      })(),
    ])

    expect(newWindow).toBeTruthy()
    expect(await newWindow.title()).toBe(`Window ${currentCount + 1}`)
  })

  test('waitForWindowByMatcher waits for a window matching custom criteria', async () => {
    const app = getApp()
    const currentCount = app.windows().length
    const expectedTitle = `Window ${currentCount + 1}`

    // Start waiting for the window before triggering its creation
    const [newWindow] = await Promise.all([
      waitForWindowByMatcher(
        app,
        async (page) => {
          const title = await page.title()
          return title === expectedTitle
        },
        { timeout: 5000 }
      ),
      clickMenuItemById(app, 'new-window'),
    ])

    expect(newWindow).toBeTruthy()
    expect(await newWindow.title()).toBe(expectedTitle)
  })

  test('waitForWindowByTitle times out when no matching window appears', async () => {
    const app = getApp()
    await expect(
      waitForWindowByTitle(app, 'This Window Will Never Exist', { timeout: 500 })
    ).rejects.toThrow(/timeout/i)
  })
})

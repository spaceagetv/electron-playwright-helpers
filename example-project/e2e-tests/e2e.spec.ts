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
  ipcMainCallFirstListener,
  ipcMainEmit,
  ipcMainInvokeHandler,
  ipcRendererCallFirstListener,
  ipcRendererEmit,
  ipcRendererInvoke,
  ipcRendererSend,
  parseElectronApp,
  stubDialog,
  waitForMenuItemStatus,
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
    args: [appInfo.main],
    executablePath: appInfo.executable,
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
  await expect(
    ipcRendererCallFirstListener(page, 'bogus-channel')
  ).rejects.toThrowError(`No ipcRenderer listeners for 'bogus-channel'`)
})

test('throw error via ipcRendererCallFirstListener with bogus page`)', async () => {
  const page = {} as Page
  await expect(
    ipcRendererCallFirstListener(page, 'get-asynchronous-data')
  ).rejects.toThrowError()
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
    clickMenuItemById(electronApp, 'checkbox'),
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

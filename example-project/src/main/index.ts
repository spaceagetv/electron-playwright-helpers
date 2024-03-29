import { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } from 'electron'

declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

let count = 0

const createWindow = (): void => {
  count++
  let x = 20
  let y = 20
  const frontWindow = BrowserWindow.getFocusedWindow()
  if (frontWindow) {
    const bounds = frontWindow.getBounds()
    x = bounds.x + 20
    y = bounds.y + 20
  }

  // are we running tests?
  const testing = process.env.CI === 'e2e'

  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    x,
    y,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      additionalArguments: [`--window-id=${count}`],
      nodeIntegration: testing ? true : false,
      contextIsolation: testing ? false : true,
    },
    show: false,
  })

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

let openedFile = ''

async function openFile() {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    message: 'Open a file',
  })
  if (result.canceled) {
    return
  }
  openedFile = result.filePaths[0]
}

async function closeFile() {
  if (!openedFile) return
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Yes', 'No'],
    message: 'Are you sure you want to close this file?',
  })
  if (result.response !== 0) return
  openedFile = ''
}

async function saveFileToLocation() {
  if (!openedFile) {
    throw new Error('No file is open')
  }
  const result = await dialog.showSaveDialog({
    message: 'Save the file',
  })
  if (result.canceled) return
  openedFile = result.filePath
}

/** This allows us to get the value in E2E */
ipcMain.handle('get-opened-file', () => {
  return openedFile
})

function initMenu() {
  const menu = Menu.getApplicationMenu()
  // create the "New Window" MenuItem
  const newWindow = new MenuItem({
    label: 'New Window',
    id: 'new-window',
    accelerator: 'CmdOrCtrl+N',
    click: () => {
      createWindow()
    },
  })

  // open a file
  const openFileItem = new MenuItem({
    label: 'Open File',
    id: 'open-file',
    accelerator: 'CmdOrCtrl+O',
    click: openFile,
  })

  // save a file
  const saveFileItem = new MenuItem({
    label: 'Save File',
    id: 'save-file',
    accelerator: 'CmdOrCtrl+S',
    click: saveFileToLocation,
  })

  // close a file
  const closeFileItem = new MenuItem({
    label: 'Close File',
    id: 'close-file',
    click: closeFile,
  })

  // create a checkbox menu item
  const checkbox = new MenuItem({
    label: 'Checkbox',
    id: 'checkbox',
    type: 'checkbox',
    checked: false,
  })

  const fileMenu = menu.items.find(
    // typescript wants "fileMenu", but items seem to be .toLowerCase()
    (item) => item.role === ('filemenu' as 'fileMenu')
  )
  if (!fileMenu) {
    throw new Error('Unable to find File menu')
  }
  if (fileMenu) {
    // add the "New Window" MenuItem to the beginning of the File menu
    fileMenu.submenu.insert(0, newWindow)
    // add the "Open File" MenuItem to the end of the File menu
    fileMenu.submenu.insert(1, openFileItem)
    // add the "Close File" MenuItem to the end of the File menu
    fileMenu.submenu.insert(2, closeFileItem)
    // add the "Save File" MenuItem to the end of the File menu
    fileMenu.submenu.insert(3, saveFileItem)
    // add the checkbox menu item to the end of the File menu
    fileMenu.submenu.append(checkbox)
  }
  // update the application menu
  Menu.setApplicationMenu(menu)
}

app.on('ready', () => {
  initMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

/**
 * Respond to IPC request for a new window
 */
ipcMain.on('new-window', () => {
  createWindow()
})

/**
 * Return the current number of windows (via IPC)
 */
ipcMain.handle('how-many-windows', () => {
  return count
})

function mainSynchronousData() {
  return 'Main Synchronous Data'
}

async function mainAsynchronousData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Main Asynchronous Data')
    }, 1000)
  })
}

ipcMain.on('main-synchronous-data', () => {
  return mainSynchronousData()
})

ipcMain.on('main-asynchronous-data', async () => {
  return await mainAsynchronousData()
})

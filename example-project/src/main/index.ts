import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  dialog,
  nativeImage,
} from 'electron'

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

// Additional dialog functions for testing matchers
async function showDeleteConfirmation() {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Delete File',
    message: 'Are you sure you want to delete this file?',
    detail: 'This action cannot be undone.',
    buttons: ['Cancel', 'Delete'],
    defaultId: 0,
    cancelId: 0,
  })
  return result.response
}

async function showSaveChangesDialog() {
  const result = await dialog.showMessageBox({
    type: 'question',
    title: 'Save Changes',
    message: 'Do you want to save your changes?',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
  })
  return result.response
}

async function showSelectImageDialog() {
  const result = await dialog.showOpenDialog({
    title: 'Select Image',
    message: 'Choose an image file',
    buttonLabel: 'Select',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'gif'] }],
  })
  return result
}

async function showExportDialog() {
  const result = await dialog.showSaveDialog({
    title: 'Export File',
    message: 'Choose where to export',
    buttonLabel: 'Export',
    defaultPath: 'export.txt',
  })
  return result
}

ipcMain.handle('show-delete-confirmation', async () => {
  return await showDeleteConfirmation()
})

ipcMain.handle('show-save-changes-dialog', async () => {
  return await showSaveChangesDialog()
})

ipcMain.handle('show-select-image-dialog', async () => {
  return await showSelectImageDialog()
})

ipcMain.handle('show-export-dialog', async () => {
  return await showExportDialog()
})

function initMenu() {
  const menu = Menu.getApplicationMenu()

  // Create a nativeImage from base64 encoded skull PNG with multiple representations
  const skullImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAActJREFUWEftVm1NxUAQnOcAHIADcAAScAAKAAWAAnAADsABOAAH4ODhADrJbbO97se1r0lDwv56r727nZ2dnesGK8dm5fzYFcBBKeBrbiFTAJwAeAawlyQjmDsATy2gWgDcArhpOcxYc5EByQBsq4pfAFwD8Cg/AnDZvT9XYLj20CsgAvCjNpFSMjElaubMXB4AnXwfwPeUzGot9UIWJUb5LACfXd9E3VmLWnFJQR8AjvUmK4EsZt9mj1eFjBP0Wp4NGK0BcBEXM5aqXrCIoN8AnHo9kerPAFDxSwYn47Eurq5SANTPtZiisXrvgHMUGZZ4R+frRDqJB0wYocvRZHSwOj3/VhsFQA9OJ6LyOQHRxkjAenSzFvcCn8uAZUyWZXtMmgwQtacBvhN/eCh2zGdkjSYlRnXf/b4q/5mkjlADGgDHhOOSBUFRO1ayei/FSZEOWuz5ACvKDtWaabFrYTD0Ac0CLZPW6YW27AywK3DL7bQbLmHHOvmgemvcpNpdr2I5J72SI7/XFEdgvRbpItwWZReO6d/ZaJT3AiCcqAyA5Q1ysP7es4BGntLX8A9gCgONrR8tC3P8CQDygTqXgfC7soWBuYmb9q0O4Bea3mshp/RlaQAAAABJRU5ErkJggg=='
  const skullImage32px = nativeImage.createFromDataURL(
    `data:image/png;base64,${skullImageBase64}`
  )

  // Create a properly sized nativeImage with multiple representations
  const skullImage = nativeImage.createEmpty()

  // Add 16x16 representation for 1x displays (standard density)
  const skullImage16px = skullImage32px.resize({ width: 16, height: 16 })
  skullImage.addRepresentation({
    scaleFactor: 1.0,
    buffer: skullImage16px.toPNG(),
  })

  // Add 32x32 representation for 2x displays (retina/high-DPI)
  skullImage.addRepresentation({
    scaleFactor: 2.0,
    buffer: skullImage32px.toPNG(),
  })

  console.log(
    'Created skull image with representations, size:',
    skullImage.getSize(),
    'isEmpty:',
    skullImage.isEmpty()
  )

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

  // create a skull menu item with nativeImage icon
  const skullMenuItem = new MenuItem({
    label: 'Skull',
    id: 'skull-menu-item',
    icon: skullImage,
    click: () => {
      console.log('Skull menu item clicked! 💀')
    },
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
    // add the skull menu item to test nativeImage handling
    fileMenu.submenu.append(skullMenuItem)
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

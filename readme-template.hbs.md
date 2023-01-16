# Electron Playwright Helpers

[![NPM](https://nodei.co/npm/electron-playwright-helpers.png)](https://nodei.co/npm/electron-playwright-helpers/)

Helper functions to make it easier to use [Playwright](https://playwright.dev/) for end-to-end testing with
[Electron](https://www.electronjs.org/). Parse packaged Electron projects so you can run tests on them. Click Electron menu items, send IPC messages, get menu structures, stub `dialog.showOpenDialog()` results, etc.

## Installation

```shell
npm i -D electron-playwright-helpers
```

## Usage

For a full example of how to use this library, see the 
[electron-playwright-example](https://github.com/spaceagetv/electron-playwright-example) project.
But here's a quick example:

Javascript:

```JS
const eph = require('electron-playwright-helpers')
// - or cherry pick -
const { findLatestBuild, parseElectronApp, clickMenuItemById } = require('electron-playwright-helpers')

let electronApp: ElectronApplication

test.beforeAll(async () => {
  // find the latest build in the out directory
  const latestBuild = findLatestBuild()
  // parse the packaged Electron app and find paths and other info
  const appInfo = parseElectronApp(latestBuild)
  electronApp = await electron.launch({
    args: [appInfo.main], // main file from package.json
    executablePath: appInfo.executable // path to the Electron executable
  })
})

test.afterAll(async () => {
  await electronApp.close()
})

test('open a file', async () => {
  // stub electron dialog so dialog.showOpenDialog() 
  // will return a file path without opening a dialog
  await eph.stubDialog(electronApp, 'showOpenDialog', { filePaths: ['/path/to/file'] })

  // call the click method of menu item in the Electron app's application menu
  await eph.clickMenuItemById(electronApp, 'open-file')

  // get the result of an ipcMain.handle() function
  const result = await eph.ipcMainInvokeHandler(electronApp, 'get-open-file-path')
  
  // result should be the file path
  expect(result).toBe('/path/to/file')
})
```

Typescript:

```TS
import * as eph from 'electron-playwright-helpers'
// - or cherry pick -
import { electronWaitForFunction, ipcMainCallFirstListener, clickMenuItemById } from 'electron-playwright-helpers'

// then same as Javascript above
```

## Contributing

Yes, please! Pull requests are always welcome. Feel free to add or suggest new features, fix bugs, etc.

## Additional Resources

* [Electron Playwright Example](https://github.com/spaceagetv/electron-playwright-example) - an example of how to use this library
* [Playwright API](https://playwright.dev/docs/api/class-electron) - Playwright API docs for Electron
* [Electron API](https://electronjs.org/docs/api/app) - Electron API

## API

{{>main}}
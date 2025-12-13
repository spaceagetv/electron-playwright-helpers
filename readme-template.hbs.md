# Electron Playwright Helpers

[![npm version](https://img.shields.io/npm/v/electron-playwright-helpers.svg)](https://www.npmjs.com/package/electron-playwright-helpers)
[![npm downloads](https://img.shields.io/npm/dm/electron-playwright-helpers.svg)](https://www.npmjs.com/package/electron-playwright-helpers)

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

Please use [Conventional Commit](https://www.conventionalcommits.org/) messages for your commits. This project uses [semantic-release](https://github.com/semantic-release/semantic-release) to automatically publish new versions to NPM. The commit messages are used to determine the version number and changelog. We're also using Prettier as our code format and ESlint to enforce formatting, so please make sure your code is formatted before submitting a PR.

## Migrating from v1.x to v2.0

Version 2.0 introduces significant improvements to handle flakiness issues that appeared with Electron 27+ and Playwright. Starting with Electron 27, Playwright's `evaluate()` calls became unreliable, often throwing errors like "context or browser has been closed", "Promise was collected", or "Execution context was destroyed" seemingly at random.

### What's New in v2.0

#### Built-in Retry Logic

All helper functions now automatically retry operations that fail due to Playwright context issues. This happens transparently - your existing code will work without changes, but will be more reliable.

#### New Utility Functions

- **`retry(fn, options)`** - Wrap any Playwright call to automatically retry on context errors
- **`retryUntilTruthy(fn, options)`** - Like Playwright's `page.waitForFunction()` but with automatic retry on errors
- **`setRetryOptions(options)`** - Configure default retry behavior globally
- **`getRetryOptions()`** - Get current retry configuration
- **`resetRetryOptions()`** - Reset retry options to defaults

#### Conditional Dialog Stubbing (New!)

- **`stubDialogMatchers(app, stubs, options)`** - Stub dialogs with conditional matching based on dialog options
- **`clearDialogMatchers(app)`** - Clear dialog matcher stubs

### Breaking Changes

#### 1. Node.js 18+ Required

Version 2.0 requires Node.js 18 or later due to modern JavaScript features like `structuredClone()`.

#### 2. IPC Helper Function Signatures

IPC helpers now accept an optional `RetryOptions` object as the last argument:

```typescript
// v1.x
await ipcRendererSend(page, 'my-channel', arg1, arg2)

// v2.0 - still works exactly the same
await ipcRendererSend(page, 'my-channel', arg1, arg2)

// v2.0 - with retry options
await ipcRendererSend(page, 'my-channel', arg1, arg2, { timeout: 10000 })
```

This applies to: `ipcRendererSend`, `ipcRendererInvoke`, `ipcRendererEmit`, `ipcRendererCallFirstListener`, `ipcMainEmit`, `ipcMainCallFirstListener`, `ipcMainInvokeHandler`

#### 3. Menu Helper Function Signatures

Menu helpers now accept an optional `RetryOptions` object:

```typescript
// v1.x
await clickMenuItemById(electronApp, 'my-menu-item')

// v2.0 - still works exactly the same
await clickMenuItemById(electronApp, 'my-menu-item')

// v2.0 - with retry options
await clickMenuItemById(electronApp, 'my-menu-item', { timeout: 10000 })
```

### Migration Steps

For most projects, upgrading is straightforward:

1. **Update Node.js** to version 18 or later
2. **Update the package**: `npm install electron-playwright-helpers@latest`
3. **Test your suite** - existing code should work without changes

### Customizing Retry Behavior

If you need to adjust retry behavior globally:

```typescript
import { setRetryOptions, resetRetryOptions } from 'electron-playwright-helpers'

// Increase timeout for slow CI environments
setRetryOptions({
  timeout: 10000,  // 10 seconds (default: 5000)
  poll: 500,       // poll every 500ms (default: 200)
})

// Reset to defaults
resetRetryOptions()
```

Or disable retries for specific calls:

```typescript
await ipcRendererSend(page, 'channel', arg, { disable: true })
```

### Using the New Retry Functions

If you have custom Playwright `evaluate()` calls that aren't using our helpers, wrap them with `retry()`:

```typescript
import { retry, retryUntilTruthy } from 'electron-playwright-helpers'

// Wrap evaluate calls to handle context errors
const result = await retry(() =>
  electronApp.evaluate(({ app }) => app.getName())
)

// Wait for a condition with automatic error recovery
await retryUntilTruthy(() =>
  page.evaluate(() => document.body.classList.contains('ready'))
)
```

## Additional Resources

* [Electron Playwright Example](https://github.com/spaceagetv/electron-playwright-example) - an example of how to use this library
* [Playwright Electron Class](https://playwright.dev/docs/api/class-electron) - Playwright API docs for Electron
* [Electron API](https://electronjs.org/docs/api/app) - Electron API documentation

## API

{{>main}}
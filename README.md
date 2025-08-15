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

Please use [Conventional Commit](https://www.conventionalcommits.org/) messages for your commits. This project uses [semantic-release](https://github.com/semantic-release/semantic-release) to automatically publish new versions to NPM. The commit messages are used to determine the version number and changelog. We're also using Prettier as our code format and ESlint to enforce formatting, so please make sure your code is formatted before submitting a PR.

## Additional Resources

* [Electron Playwright Example](https://github.com/spaceagetv/electron-playwright-example) - an example of how to use this library
* [Playwright Electron Class](https://playwright.dev/docs/api/class-electron) - Playwright API docs for Electron
* [Electron API](https://electronjs.org/docs/api/app) - Electron API documentation

## API

## Functions

<dl>
<dt><a href="#findLatestBuild">findLatestBuild(buildDirectory)</a> ⇒ <code>string</code></dt>
<dd><p>Parses the <code>out</code> directory to find the latest build of your Electron project.
Use <code>npm run package</code> (or similar) to build your app prior to testing.</p>
<p>Assumptions: We assume that your build will be in the <code>out</code> directory, and that
the build directory will be named with a hyphen-delimited platform name, e.g.
<code>out/my-app-win-x64</code>. If your build directory is not <code>out</code>, you can
pass the name of the directory as the <code>buildDirectory</code> parameter. If your
build directory is not named with a hyphen-delimited platform name, this
function will not work. However, you can pass the build path into
<code>parseElectronApp()</code> directly.</p></dd>
<dt><a href="#parseElectronApp">parseElectronApp(buildDir)</a> ⇒ <code><a href="#ElectronAppInfo">ElectronAppInfo</a></code></dt>
<dd><p>Given a directory containing an Electron app build,
or the path to the app itself (directory on Mac, executable on Windows),
return a bunch of metadata, including the path to the app's executable
and the path to the app's main file.</p>
<p>Format of the data returned is an object with the following properties:</p>
<ul>
<li>executable: path to the app's executable file</li>
<li>main: path to the app's main (JS) file</li>
<li>name: name of the app</li>
<li>resourcesDir: path to the app's resources directory</li>
<li>asar: true if the app is using asar</li>
<li>platform: OS platform</li>
<li>arch: architecture</li>
<li>packageJson: the JSON.parse()'d contents of the package.json file.</li>
</ul></dd>
<dt><a href="#electronWaitForFunction">electronWaitForFunction(electronApp, fn, arg)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Wait for a function to evaluate to true in the main Electron process. This really
should be part of the Playwright API, but it's not.</p>
<p>This function is to <code>electronApp.evaluate()</code>
as <code>page.waitForFunction()</code> is <code>page.evaluate()</code>.</p></dd>
<dt><a href="#stubDialog">stubDialog(app, method, value)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Stub a single dialog method. This is a convenience function that calls <code>stubMultipleDialogs</code>
for a single method.</p>
<p>Playwright does not have a way to interact with Electron dialog windows,
so this function allows you to substitute the dialog module's methods during your tests.
By stubbing the dialog module, your Electron application will not display any dialog windows,
and you can control the return value of the dialog methods. You're basically saying
&quot;when my application calls dialog.showOpenDialog, return this value instead&quot;. This allows you
to test your application's behavior when the user selects a file, or cancels the dialog, etc.</p>
<p>Note: Each dialog method can only be stubbed with one value at a time, so you will want to call
<code>stubDialog</code> before each time that you expect your application to call the dialog method.</p></dd>
<dt><a href="#stubMultipleDialogs">stubMultipleDialogs(app, mocks)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Stub methods of the Electron dialog module.</p>
<p>Playwright does not have a way to interact with Electron dialog windows,
so this function allows you to mock the dialog module's methods during your tests.
By mocking the dialog module, your Electron application will not display any dialog windows,
and you can control the return value of the dialog methods. You're basically saying
&quot;when my application calls dialog.showOpenDialog, return this value instead&quot;. This allows you
to test your application's behavior when the user selects a file, or cancels the dialog, etc.</p></dd>
<dt><a href="#stubAllDialogs">stubAllDialogs(app)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Stub all dialog methods. This is a convenience function that calls <code>stubMultipleDialogs</code>
for all dialog methods. This is useful if you want to ensure that dialogs are not displayed
during your tests. However, you may want to use <code>stubDialog</code> or <code>stubMultipleDialogs</code> to
control the return value of specific dialog methods (e.g. <code>showOpenDialog</code>) during your tests.</p></dd>
<dt><a href="#ipcMainEmit">ipcMainEmit(electronApp, message, ...args)</a> ⇒ <code>Promise.&lt;boolean&gt;</code></dt>
<dd><p>Emit an ipcMain message from the main process.
This will trigger all ipcMain listeners for the message.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the main process.</p></dd>
<dt><a href="#ipcMainCallFirstListener">ipcMainCallFirstListener(electronApp, message, ...args)</a> ⇒ <code>Promise.&lt;unknown&gt;</code></dt>
<dd><p>Call the first listener for a given ipcMain message in the main process
and return its result.</p>
<p>NOTE: ipcMain listeners usually don't return a value, but we're using
this to retrieve test data from the main process.</p>
<p>Generally, it's probably better to use <code>ipcMainInvokeHandler()</code> instead.</p></dd>
<dt><a href="#ipcMainInvokeHandler">ipcMainInvokeHandler(electronApp, message, ...args)</a> ⇒ <code>Promise.&lt;unknown&gt;</code></dt>
<dd><p>Get the return value of an <code>ipcMain.handle()</code> function</p></dd>
<dt><a href="#ipcRendererSend">ipcRendererSend(page, channel, ...args)</a> ⇒ <code>Promise.&lt;unknown&gt;</code></dt>
<dd><p>Send an <code>ipcRenderer.send()</code> (to main process) from a given window.</p>
<p>Note: nodeIntegration must be true and contextIsolation must be false
in the webPreferences for this BrowserWindow.</p></dd>
<dt><a href="#ipcRendererInvoke">ipcRendererInvoke(page, message, ...args)</a> ⇒ <code>Promise.&lt;unknown&gt;</code></dt>
<dd><p>Send an ipcRenderer.invoke() from a given window.</p>
<p>Note: nodeIntegration must be true and contextIsolation must be false
in the webPreferences for this window</p></dd>
<dt><a href="#ipcRendererCallFirstListener">ipcRendererCallFirstListener(page, message, ...args)</a> ⇒ <code>Promise.&lt;unknown&gt;</code></dt>
<dd><p>Call just the first listener for a given ipcRenderer channel in a given window.
<em>UNLIKE MOST Electron ipcRenderer listeners</em>, this function SHOULD return a value.</p>
<p>This function does not send data between main and renderer processes.
It simply retrieves data from the renderer process.</p>
<p>Note: nodeIntegration must be true for this BrowserWindow.</p></dd>
<dt><a href="#ipcRendererEmit">ipcRendererEmit(page, message, ...args)</a> ⇒ <code>Promise.&lt;boolean&gt;</code></dt>
<dd><p>Emit an IPC message to a given window.
This will trigger all ipcRenderer listeners for the message.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the renderer process.</p>
<p>Note: nodeIntegration must be true for this window</p></dd>
<dt><a href="#clickMenuItemById">clickMenuItemById(electronApp, id)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Execute the <code>.click()</code> method on the element with the given id.
<strong>NOTE:</strong> All menu testing functions will only work with items in the
<a href="https://www.electronjs.org/docs/latest/api/menu#menusetapplicationmenumenu">application menu</a>.</p></dd>
<dt><a href="#clickMenuItem">clickMenuItem(electronApp, property, value)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Click the first matching menu item by any of its properties. This is
useful for menu items that don't have an id. HOWEVER, this is not as fast
or reliable as using <code>clickMenuItemById()</code> if the menu item has an id.</p>
<p><strong>NOTE:</strong> All menu testing functions will only work with items in the
<a href="https://www.electronjs.org/docs/latest/api/menu#menusetapplicationmenumenu">application menu</a>.</p></dd>
<dt><a href="#getMenuItemAttribute">getMenuItemAttribute(electronApp, menuId, attribute)</a> ⇒ <code>Promise.&lt;string&gt;</code></dt>
<dd><p>Get a given attribute the MenuItem with the given id.</p></dd>
<dt><a href="#getMenuItemById">getMenuItemById(electronApp, menuId)</a> ⇒ <code>Promise.&lt;MenuItemPartial&gt;</code></dt>
<dd><p>Get information about the MenuItem with the given id</p></dd>
<dt><a href="#getApplicationMenu">getApplicationMenu(electronApp)</a> ⇒ <code>Promise.&lt;Array.&lt;MenuItemPartial&gt;&gt;</code></dt>
<dd><p>Get the current state of the application menu. Contains only primitive values and submenus..
Very similar to menu
<a href="https://www.electronjs.org/docs/latest/api/menu#examples">construction template structure</a>
in Electron.</p></dd>
<dt><a href="#findMenuItem">findMenuItem(electronApp, property, value, menuItems)</a> ⇒ <code>Promise.&lt;MenuItemPartial&gt;</code></dt>
<dd><p>Find a MenuItem by any of its properties</p></dd>
<dt><a href="#waitForMenuItem">waitForMenuItem(electronApp, id)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Wait for a MenuItem to exist</p></dd>
<dt><a href="#waitForMenuItemStatus">waitForMenuItemStatus(electronApp, id, property, value)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Wait for a MenuItem to have a specific attribute value.
For example, wait for a MenuItem to be enabled... or be visible.. etc</p></dd>
<dt><a href="#addTimeoutToPromise">addTimeoutToPromise(promise, timeoutMs, timeoutMessage)</a> ⇒ <code>Promise.&lt;T&gt;</code></dt>
<dd><p>Add a timeout to any Promise</p></dd>
<dt><a href="#addTimeout">addTimeout(functionName, timeoutMs, timeoutMessage, ...args)</a> ⇒ <code>Promise.&lt;T&gt;</code></dt>
<dd><p>Add a timeout to any helper function from this library which returns a Promise.</p></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ElectronAppInfo">ElectronAppInfo</a></dt>
<dd><p>Format of the data returned from <code>parseElectronApp()</code></p></dd>
</dl>

<a name="findLatestBuild"></a>

## findLatestBuild(buildDirectory) ⇒ <code>string</code>
<p>Parses the <code>out</code> directory to find the latest build of your Electron project.
Use <code>npm run package</code> (or similar) to build your app prior to testing.</p>
<p>Assumptions: We assume that your build will be in the <code>out</code> directory, and that
the build directory will be named with a hyphen-delimited platform name, e.g.
<code>out/my-app-win-x64</code>. If your build directory is not <code>out</code>, you can
pass the name of the directory as the <code>buildDirectory</code> parameter. If your
build directory is not named with a hyphen-delimited platform name, this
function will not work. However, you can pass the build path into
<code>parseElectronApp()</code> directly.</p>

**Kind**: global function  
**Returns**: <code>string</code> - <ul>
<li>path to the most recently modified build directory</li>
</ul>  
**See**: parseElectronApp  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| buildDirectory | <code>string</code> | <code>&quot;out&quot;</code> | <p>optional - the directory to search for the latest build (path/name relative to package root or full path starting with /). Defaults to <code>out</code>.</p> |

<a name="parseElectronApp"></a>

## parseElectronApp(buildDir) ⇒ [<code>ElectronAppInfo</code>](#ElectronAppInfo)
<p>Given a directory containing an Electron app build,
or the path to the app itself (directory on Mac, executable on Windows),
return a bunch of metadata, including the path to the app's executable
and the path to the app's main file.</p>
<p>Format of the data returned is an object with the following properties:</p>
<ul>
<li>executable: path to the app's executable file</li>
<li>main: path to the app's main (JS) file</li>
<li>name: name of the app</li>
<li>resourcesDir: path to the app's resources directory</li>
<li>asar: true if the app is using asar</li>
<li>platform: OS platform</li>
<li>arch: architecture</li>
<li>packageJson: the JSON.parse()'d contents of the package.json file.</li>
</ul>

**Kind**: global function  
**Returns**: [<code>ElectronAppInfo</code>](#ElectronAppInfo) - <p>metadata about the app</p>  

| Param | Type | Description |
| --- | --- | --- |
| buildDir | <code>string</code> | <p>absolute path to the build directory or the app itself</p> |

<a name="electronWaitForFunction"></a>

## electronWaitForFunction(electronApp, fn, arg) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Wait for a function to evaluate to true in the main Electron process. This really
should be part of the Playwright API, but it's not.</p>
<p>This function is to <code>electronApp.evaluate()</code>
as <code>page.waitForFunction()</code> is <code>page.evaluate()</code>.</p>

**Kind**: global function  
**Fulfil**: <code>void</code> Resolves when the function returns true  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Playwright ElectronApplication</p> |
| fn | <code>function</code> | <p>the function to evaluate in the main process - must return a boolean</p> |
| arg | <code>Any</code> | <p>optional - an argument to pass to the function</p> |

<a name="ElectronAppInfo"></a>

## ElectronAppInfo
<p>Format of the data returned from <code>parseElectronApp()</code></p>

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| executable | <code>string</code> | <p>path to the Electron executable</p> |
| main | <code>string</code> | <p>path to the main (JS) file</p> |
| name | <code>string</code> | <p>name of the your application</p> |
| resourcesDir | <code>string</code> | <p>path to the resources directory</p> |
| asar | <code>boolean</code> | <p>whether the app is packaged as an asar archive</p> |
| platform | <code>string</code> | <p>'darwin', 'linux', or 'win32'</p> |
| arch | <code>string</code> | <p>'x64', 'x32', or 'arm64'</p> |
| packageJson | <code>PackageJson</code> | <p>the <code>JSON.parse()</code>'d contents of the package.json file.</p> |

<a name="stubDialog"></a>

## stubDialog(app, method, value) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Stub a single dialog method. This is a convenience function that calls <code>stubMultipleDialogs</code>
for a single method.</p>
<p>Playwright does not have a way to interact with Electron dialog windows,
so this function allows you to substitute the dialog module's methods during your tests.
By stubbing the dialog module, your Electron application will not display any dialog windows,
and you can control the return value of the dialog methods. You're basically saying
&quot;when my application calls dialog.showOpenDialog, return this value instead&quot;. This allows you
to test your application's behavior when the user selects a file, or cancels the dialog, etc.</p>
<p>Note: Each dialog method can only be stubbed with one value at a time, so you will want to call
<code>stubDialog</code> before each time that you expect your application to call the dialog method.</p>

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - <p>A promise that resolves when the mock is applied.</p>  
**Category**: Dialog  
**Fullfil**: <code>void</code> - A promise that resolves when the mock is applied.  
**See**: stubMultipleDialogs  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>ElectronApplication</code> | <p>The Playwright ElectronApplication instance.</p> |
| method | <code>String</code> | <p>The <a href="https://www.electronjs.org/docs/latest/api/dialog#methods">dialog method</a> to mock.</p> |
| value | <code>ReturnType.&lt;Electron.Dialog&gt;</code> | <p>The value that your application will receive when calling this dialog method. See the <a href="https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options">Electron docs</a> for the return value of each method.</p> |

**Example**  
```ts
await stubDialog(app, 'showOpenDialog', {
 filePaths: ['/path/to/file'],
 canceled: false,
})
await clickMenuItemById(app, 'open-file')
// when time your application calls dialog.showOpenDialog,
// it will return the value you specified
```
<a name="stubMultipleDialogs"></a>

## stubMultipleDialogs(app, mocks) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Stub methods of the Electron dialog module.</p>
<p>Playwright does not have a way to interact with Electron dialog windows,
so this function allows you to mock the dialog module's methods during your tests.
By mocking the dialog module, your Electron application will not display any dialog windows,
and you can control the return value of the dialog methods. You're basically saying
&quot;when my application calls dialog.showOpenDialog, return this value instead&quot;. This allows you
to test your application's behavior when the user selects a file, or cancels the dialog, etc.</p>

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - <p>A promise that resolves when the mocks are applied.</p>  
**Category**: Dialog  
**Fullfil**: <code>void</code> - A promise that resolves when the mocks are applied.  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>ElectronApplication</code> | <p>The Playwright ElectronApplication instance.</p> |
| mocks | <code>Array.&lt;DialogMethodStubPartial&gt;</code> | <p>An array of dialog method mocks to apply.</p> |

**Example**  
```ts
await stubMultipleDialogs(app, [
 {
   method: 'showOpenDialog',
   value: {
     filePaths: ['/path/to/file1', '/path/to/file2'],
     canceled: false,
   },
 },
 {
    method: 'showSaveDialog',
    value: {
      filePath: '/path/to/file',
      canceled: false,
    },
  },
])
await clickMenuItemById(app, 'save-file')
// when your application calls dialog.showSaveDialog,
// it will return the value you specified
```
<a name="stubAllDialogs"></a>

## stubAllDialogs(app) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Stub all dialog methods. This is a convenience function that calls <code>stubMultipleDialogs</code>
for all dialog methods. This is useful if you want to ensure that dialogs are not displayed
during your tests. However, you may want to use <code>stubDialog</code> or <code>stubMultipleDialogs</code> to
control the return value of specific dialog methods (e.g. <code>showOpenDialog</code>) during your tests.</p>

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - <p>A promise that resolves when the mocks are applied.</p>  
**Category**: Dialog  
**Fullfil**: <code>void</code> - A promise that resolves when the mocks are applied.  
**See**: stubDialog  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>ElectronApplication</code> | <p>The Playwright ElectronApplication instance.</p> |

<a name="ipcMainEmit"></a>

## ipcMainEmit(electronApp, message, ...args) ⇒ <code>Promise.&lt;boolean&gt;</code>
<p>Emit an ipcMain message from the main process.
This will trigger all ipcMain listeners for the message.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the main process.</p>

**Kind**: global function  
**Category**: IPCMain  
**Fulfil**: <code>boolean</code> true if there were listeners for this message  
**Reject**: <code>Error</code> if there are no ipcMain listeners for the event  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the ElectronApplication object from Playwright</p> |
| message | <code>string</code> | <p>the channel to call all ipcMain listeners for</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send</p> |

<a name="ipcMainCallFirstListener"></a>

## ipcMainCallFirstListener(electronApp, message, ...args) ⇒ <code>Promise.&lt;unknown&gt;</code>
<p>Call the first listener for a given ipcMain message in the main process
and return its result.</p>
<p>NOTE: ipcMain listeners usually don't return a value, but we're using
this to retrieve test data from the main process.</p>
<p>Generally, it's probably better to use <code>ipcMainInvokeHandler()</code> instead.</p>

**Kind**: global function  
**Category**: IPCMain  
**Fulfil**: <code>unknown</code> resolves with the result of the function  
**Reject**: <code>Error</code> if there are no ipcMain listeners for the event  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the ElectronApplication object from Playwright</p> |
| message | <code>string</code> | <p>the channel to call the first listener for</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send</p> |

<a name="ipcMainInvokeHandler"></a>

## ipcMainInvokeHandler(electronApp, message, ...args) ⇒ <code>Promise.&lt;unknown&gt;</code>
<p>Get the return value of an <code>ipcMain.handle()</code> function</p>

**Kind**: global function  
**Category**: IPCMain  
**Fulfil**: <code>unknown</code> resolves with the result of the function called in main process  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the ElectronApplication object from Playwright</p> |
| message | <code>string</code> | <p>the channel to call the first listener for</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send</p> |

<a name="ipcRendererSend"></a>

## ipcRendererSend(page, channel, ...args) ⇒ <code>Promise.&lt;unknown&gt;</code>
<p>Send an <code>ipcRenderer.send()</code> (to main process) from a given window.</p>
<p>Note: nodeIntegration must be true and contextIsolation must be false
in the webPreferences for this BrowserWindow.</p>

**Kind**: global function  
**Category**: IPCRenderer  
**Fulfil**: <code>unknown</code> resolves with the result of `ipcRenderer.send()`  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>Page</code> | <p>the Playwright Page to send the ipcRenderer.send() from</p> |
| channel | <code>string</code> | <p>the channel to send the ipcRenderer.send() to</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send to the <code>ipcRenderer.send()</code></p> |

<a name="ipcRendererInvoke"></a>

## ipcRendererInvoke(page, message, ...args) ⇒ <code>Promise.&lt;unknown&gt;</code>
<p>Send an ipcRenderer.invoke() from a given window.</p>
<p>Note: nodeIntegration must be true and contextIsolation must be false
in the webPreferences for this window</p>

**Kind**: global function  
**Category**: IPCRenderer  
**Fulfil**: <code>unknown</code> resolves with the result of ipcRenderer.invoke()  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>Page</code> | <p>the Playwright Page to send the ipcRenderer.invoke() from</p> |
| message | <code>string</code> | <p>the channel to send the ipcRenderer.invoke() to</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send to the ipcRenderer.invoke()</p> |

<a name="ipcRendererCallFirstListener"></a>

## ipcRendererCallFirstListener(page, message, ...args) ⇒ <code>Promise.&lt;unknown&gt;</code>
<p>Call just the first listener for a given ipcRenderer channel in a given window.
<em>UNLIKE MOST Electron ipcRenderer listeners</em>, this function SHOULD return a value.</p>
<p>This function does not send data between main and renderer processes.
It simply retrieves data from the renderer process.</p>
<p>Note: nodeIntegration must be true for this BrowserWindow.</p>

**Kind**: global function  
**Category**: IPCRenderer  
**Fulfil**: <code>unknown</code> the result of the first `ipcRenderer.on()` listener  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>Page</code> | <p>The Playwright Page to with the <code>ipcRenderer.on()</code> listener</p> |
| message | <code>string</code> | <p>The channel to call the first listener for</p> |
| ...args | <code>unknown</code> | <p>optional - One or more arguments to send to the ipcRenderer.on() listener</p> |

<a name="ipcRendererEmit"></a>

## ipcRendererEmit(page, message, ...args) ⇒ <code>Promise.&lt;boolean&gt;</code>
<p>Emit an IPC message to a given window.
This will trigger all ipcRenderer listeners for the message.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the renderer process.</p>
<p>Note: nodeIntegration must be true for this window</p>

**Kind**: global function  
**Category**: IPCRenderer  
**Fulfil**: <code>boolean</code> true if the event was emitted  
**Reject**: <code>Error</code> if there are no ipcRenderer listeners for the event  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>Page</code> | <p>the Playwright Page to with the ipcRenderer.on() listener</p> |
| message | <code>string</code> | <p>the channel to call all ipcRenderer listeners for</p> |
| ...args | <code>unknown</code> | <p>optional - one or more arguments to send</p> |

<a name="clickMenuItemById"></a>

## clickMenuItemById(electronApp, id) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Execute the <code>.click()</code> method on the element with the given id.
<strong>NOTE:</strong> All menu testing functions will only work with items in the
<a href="https://www.electronjs.org/docs/latest/api/menu#menusetapplicationmenumenu">application menu</a>.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>void</code> resolves with the result of the `click()` method - probably `undefined`  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| id | <code>string</code> | <p>the id of the MenuItem to click</p> |

<a name="clickMenuItem"></a>

## clickMenuItem(electronApp, property, value) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Click the first matching menu item by any of its properties. This is
useful for menu items that don't have an id. HOWEVER, this is not as fast
or reliable as using <code>clickMenuItemById()</code> if the menu item has an id.</p>
<p><strong>NOTE:</strong> All menu testing functions will only work with items in the
<a href="https://www.electronjs.org/docs/latest/api/menu#menusetapplicationmenumenu">application menu</a>.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>void</code> resolves with the result of the `click()` method - probably `undefined`  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| property | <code>String</code> | <p>a property of the MenuItem to search for</p> |
| value | <code>String</code> \| <code>Number</code> \| <code>Boolean</code> | <p>the value of the property to search for</p> |

<a name="getMenuItemAttribute"></a>

## getMenuItemAttribute(electronApp, menuId, attribute) ⇒ <code>Promise.&lt;string&gt;</code>
<p>Get a given attribute the MenuItem with the given id.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>string</code> resolves with the attribute value  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| menuId | <code>string</code> | <p>the id of the MenuItem to retrieve the attribute from</p> |
| attribute | <code>string</code> | <p>the attribute to retrieve</p> |

<a name="getMenuItemById"></a>

## getMenuItemById(electronApp, menuId) ⇒ <code>Promise.&lt;MenuItemPartial&gt;</code>
<p>Get information about the MenuItem with the given id</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>MenuItemPartial</code> the MenuItem with the given id  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| menuId | <code>string</code> | <p>the id of the MenuItem to retrieve</p> |

<a name="getApplicationMenu"></a>

## getApplicationMenu(electronApp) ⇒ <code>Promise.&lt;Array.&lt;MenuItemPartial&gt;&gt;</code>
<p>Get the current state of the application menu. Contains only primitive values and submenus..
Very similar to menu
<a href="https://www.electronjs.org/docs/latest/api/menu#examples">construction template structure</a>
in Electron.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>MenuItemPartial[]</code> an array of MenuItem-like objects  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |

<a name="findMenuItem"></a>

## findMenuItem(electronApp, property, value, menuItems) ⇒ <code>Promise.&lt;MenuItemPartial&gt;</code>
<p>Find a MenuItem by any of its properties</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>MenuItemPartial</code> the first MenuItem with the given property and value  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| property | <code>string</code> | <p>the property to search for</p> |
| value | <code>string</code> | <p>the value to search for</p> |
| menuItems | <code>MenuItemPartial</code> \| <code>Array.&lt;MenuItemPartial&gt;</code> | <p>optional - single MenuItem or array - if not provided, will be retrieved from the application menu</p> |

<a name="waitForMenuItem"></a>

## waitForMenuItem(electronApp, id) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Wait for a MenuItem to exist</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>void</code> resolves when the MenuItem is found  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| id | <code>string</code> | <p>the id of the MenuItem to wait for</p> |

<a name="waitForMenuItemStatus"></a>

## waitForMenuItemStatus(electronApp, id, property, value) ⇒ <code>Promise.&lt;void&gt;</code>
<p>Wait for a MenuItem to have a specific attribute value.
For example, wait for a MenuItem to be enabled... or be visible.. etc</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <code>void</code> resolves when the MenuItem with correct status is found  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| id | <code>string</code> | <p>the id of the MenuItem to wait for</p> |
| property | <code>string</code> | <p>the property to search for</p> |
| value | <code>string</code> \| <code>number</code> \| <code>boolean</code> | <p>the value to search for</p> |

<a name="addTimeoutToPromise"></a>

## addTimeoutToPromise(promise, timeoutMs, timeoutMessage) ⇒ <code>Promise.&lt;T&gt;</code>
<p>Add a timeout to any Promise</p>

**Kind**: global function  
**Returns**: <code>Promise.&lt;T&gt;</code> - <p>the result of the original promise if it resolves before the timeout</p>  
**Category**: Utilities  
**See**: addTimeout  

| Param | Default | Description |
| --- | --- | --- |
| promise |  | <p>the promise to add a timeout to - must be a Promise</p> |
| timeoutMs | <code>5000</code> | <p>the timeout in milliseconds - defaults to 5000</p> |
| timeoutMessage |  | <p>optional - the message to return if the timeout is reached</p> |

<a name="addTimeout"></a>

## addTimeout(functionName, timeoutMs, timeoutMessage, ...args) ⇒ <code>Promise.&lt;T&gt;</code>
<p>Add a timeout to any helper function from this library which returns a Promise.</p>

**Kind**: global function  
**Returns**: <code>Promise.&lt;T&gt;</code> - <p>the result of the helper function if it resolves before the timeout</p>  
**Category**: Utilities  

| Param | Default | Description |
| --- | --- | --- |
| functionName |  | <p>the name of the helper function to call</p> |
| timeoutMs | <code>5000</code> | <p>the timeout in milliseconds - defaults to 5000</p> |
| timeoutMessage |  | <p>optional - the message to return if the timeout is reached</p> |
| ...args |  | <p>any arguments to pass to the helper function</p> |


# Electron Playwright Helpers

Helper functions to make it easier to use [Playwright](https://playwright.dev/) for end-to-end testing with
[Electron](https://www.electronjs.org/). Parse packaged Electron projects so you can run tests on them. Click Electron
menu items, send IPC messages, get menu structures, etc.

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

test('click menu item', async () => {
  await eph.clickMenuItemById(electronApp, 'newproject')
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

Yes, please! Pull requests are always welcome. Feel free to add new features, fix bugs, etc.

## API

## Functions

<dl>
<dt><a href="#findLatestBuild">findLatestBuild()</a> ⇒ <code>string</code></dt>
<dd><p>Parses the <code>out</code> directory to find the latest build of your Electron project.
Use <code>npm run package</code> (or similar) to build your app prior to testing.</p></dd>
<dt><a href="#parseElectronApp">parseElectronApp(buildDir)</a> ⇒ <code>ElectronAppInfo</code></dt>
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
</ul></dd>
<dt><a href="#electronWaitForFunction">electronWaitForFunction(electronApp, fn, arg)</a> ⇒ <code>Promise</code></dt>
<dd><p>Wait for a function to evaluate to true in the main Electron process. This really
should be part of the Playwright API, but it's not.</p>
<p>This function is to <code>electronApp.evaluate()</code>
as <code>page.waitForFunction()</code> is <code>page.evaluate()</code>.</p></dd>
<dt><a href="#ipcMainEmit">ipcMainEmit(electronApp, message, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Emit an ipcMain message from the main process.
This will trigger all ipcMain listeners for the event.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the main process.</p></dd>
<dt><a href="#ipcMainCallFirstListener">ipcMainCallFirstListener(electronApp, message, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Call the first listener for a given ipcMain message in the main process
and return its result.</p>
<p>NOTE: ipcMain listeners usually don't return a value, but we're using
this to retrieve test data from the main process.</p>
<p>Generally, it's probably better to use <code>ipcMainInvokeHandler()</code> instead.</p></dd>
<dt><a href="#ipcMainInvokeHandler">ipcMainInvokeHandler(electronApp, message, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Get the return value of an <code>ipcMain.handle()</code> function</p></dd>
<dt><a href="#ipcRendererSend">ipcRendererSend(page, channel, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Send an <code>ipcRenderer.send()</code> (to main process) from a given window.</p>
<p>Note: nodeIntegration must be true and contextIsolation must be false
in the webPreferences for this BrowserWindow.</p></dd>
<dt><a href="#ipcRendererInvoke">ipcRendererInvoke(page, message, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Send an ipcRenderer.invoke() from a given window.</p>
<p>Note: nodeIntegration must be true and contextIsolation must be false
in the webPreferences for this window</p></dd>
<dt><a href="#ipcRendererCallFirstListener">ipcRendererCallFirstListener(window, message, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Call just the first listener for a given ipcRenderer channel in a given window.
<em>UNLIKE MOST Electron ipcRenderer listeners</em>, this function SHOULD return a value.</p>
<p>This function does not send data between main and renderer processes.
It simply retrieves data from the renderer process.</p>
<p>Note: nodeIntegration must be true for this BrowserWindow.</p></dd>
<dt><a href="#ipcRendererEmit">ipcRendererEmit(window, message, ...args)</a> ⇒ <code>Promise</code></dt>
<dd><p>Emit an IPC event to a given window.
This will trigger all ipcRenderer listeners for the event.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the renderer process.</p>
<p>Note: nodeIntegration must be true for this window</p></dd>
<dt><a href="#clickMenuItemById">clickMenuItemById(electronApp, id)</a> ⇒ <code>Promise</code></dt>
<dd><p>Execute the <code>.click()</code> method on the element with the given id.</p></dd>
<dt><a href="#getMenuItemAttribute">getMenuItemAttribute(electronApp, menuId, attribute)</a> ⇒ <code>Promise</code></dt>
<dd><p>Get a given attribute the MenuItem with the given id.</p></dd>
<dt><a href="#getMenuItemById">getMenuItemById(electronApp, menuId)</a> ⇒ <code>Promise</code></dt>
<dd><p>Get information about the MenuItem with the given id</p></dd>
<dt><a href="#getApplicationMenu">getApplicationMenu(electronApp)</a> ⇒ <code>Promise</code></dt>
<dd><p>Get the current state of the application menu. Contains only primitive values and submenus..
Very similar to menu
<a href="https://www.electronjs.org/docs/latest/api/menu#examples">construction template structure</a>
in Electron.</p></dd>
<dt><a href="#findMenuItem">findMenuItem(electronApp, property, value, menuItems)</a> ⇒ <code>Promise</code></dt>
<dd><p>Find a MenuItem by any of its properties</p></dd>
<dt><a href="#waitForMenuItem">waitForMenuItem(electronApp, id)</a> ⇒ <code>Promise</code></dt>
<dd><p>Wait for a MenuItem to be exist</p></dd>
<dt><a href="#waitForMenuItemStatus">waitForMenuItemStatus(electronApp, id, property, value)</a> ⇒ <code>Promise</code></dt>
<dd><p>Wait for a MenuItem to have a specific attribute value.
For example, wait for a MenuItem to be enabled... or be visible.. etc</p></dd>
</dl>

<a name="findLatestBuild"></a>

## findLatestBuild() ⇒ <code>string</code>
<p>Parses the <code>out</code> directory to find the latest build of your Electron project.
Use <code>npm run package</code> (or similar) to build your app prior to testing.</p>

**Kind**: global function  
**Returns**: <code>string</code> - <ul>
<li>path to the most recently modified build directory</li>
</ul>  
<a name="parseElectronApp"></a>

## parseElectronApp(buildDir) ⇒ <code>ElectronAppInfo</code>
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
</ul>

**Kind**: global function  
**Returns**: <code>ElectronAppInfo</code> - <p>metadata about the app</p>  

| Param | Type | Description |
| --- | --- | --- |
| buildDir | <code>string</code> | <p>absolute path to the build directory or the app itself</p> |

<a name="electronWaitForFunction"></a>

## electronWaitForFunction(electronApp, fn, arg) ⇒ <code>Promise</code>
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

<a name="ipcMainEmit"></a>

## ipcMainEmit(electronApp, message, ...args) ⇒ <code>Promise</code>
<p>Emit an ipcMain message from the main process.
This will trigger all ipcMain listeners for the event.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the main process.</p>

**Kind**: global function  
**Category**: IPCMain  
**Fulfil**: <boolean> true if there were listeners for this message  
**Reject**: <Error> if there are no ipcMain listeners for the event  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the ElectronApplication object from Playwright</p> |
| message | <code>string</code> | <p>the channel to call all ipcMain listeners for</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send</p> |

<a name="ipcMainCallFirstListener"></a>

## ipcMainCallFirstListener(electronApp, message, ...args) ⇒ <code>Promise</code>
<p>Call the first listener for a given ipcMain message in the main process
and return its result.</p>
<p>NOTE: ipcMain listeners usually don't return a value, but we're using
this to retrieve test data from the main process.</p>
<p>Generally, it's probably better to use <code>ipcMainInvokeHandler()</code> instead.</p>

**Kind**: global function  
**Category**: IPCMain  
**Fulfil**: <unknown> resolves with the result of the function  
**Reject**: <Error> if there are no ipcMain listeners for the event  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the ElectronApplication object from Playwright</p> |
| message | <code>string</code> | <p>the channel to call the first listener for</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send</p> |

<a name="ipcMainInvokeHandler"></a>

## ipcMainInvokeHandler(electronApp, message, ...args) ⇒ <code>Promise</code>
<p>Get the return value of an <code>ipcMain.handle()</code> function</p>

**Kind**: global function  
**Category**: IPCMain  
**Fulfil**: <unknown> resolves with the result of the function called in main process  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the ElectronApplication object from Playwright</p> |
| message | <code>string</code> | <p>the channel to call the first listener for</p> |
| ...args | <code>unknown</code> | <p>one or more arguments to send</p> |

<a name="ipcRendererSend"></a>

## ipcRendererSend(page, channel, ...args) ⇒ <code>Promise</code>
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

## ipcRendererInvoke(page, message, ...args) ⇒ <code>Promise</code>
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

## ipcRendererCallFirstListener(window, message, ...args) ⇒ <code>Promise</code>
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
| window | <code>Page</code> | <p>The Playwright Page to with the <code>ipcRenderer.on()</code> listener</p> |
| message | <code>string</code> | <p>The channel to call the first listener for</p> |
| ...args | <code>unknown</code> | <p>optional - One or more arguments to send to the ipcRenderer.on() listener</p> |

<a name="ipcRendererEmit"></a>

## ipcRendererEmit(window, message, ...args) ⇒ <code>Promise</code>
<p>Emit an IPC event to a given window.
This will trigger all ipcRenderer listeners for the event.</p>
<p>This does not transfer data between main and renderer processes.
It simply emits an event in the renderer process.</p>
<p>Note: nodeIntegration must be true for this window</p>

**Kind**: global function  
**Category**: IPCRenderer  
**Fulfil**: <boolean> true if the event was emitted  
**Reject**: <Error> if there are no ipcRenderer listeners for the event  

| Param | Type | Description |
| --- | --- | --- |
| window | <code>Page</code> | <p>the Playwright Page to with the ipcRenderer.on() listener</p> |
| message | <code>string</code> | <p>the channel to call all ipcRenderer listeners for</p> |
| ...args | <code>unknown</code> | <p>optional - one or more arguments to send</p> |

<a name="clickMenuItemById"></a>

## clickMenuItemById(electronApp, id) ⇒ <code>Promise</code>
<p>Execute the <code>.click()</code> method on the element with the given id.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <void> resolves with the result of the `click()` method - probably `undefined`  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| id | <code>string</code> | <p>the id of the MenuItem to click</p> |

<a name="getMenuItemAttribute"></a>

## getMenuItemAttribute(electronApp, menuId, attribute) ⇒ <code>Promise</code>
<p>Get a given attribute the MenuItem with the given id.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <string> resolves with the attribute value  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| menuId | <code>string</code> | <p>the id of the MenuItem to retrieve the attribute from</p> |
| attribute | <code>string</code> | <p>the attribute to retrieve</p> |

<a name="getMenuItemById"></a>

## getMenuItemById(electronApp, menuId) ⇒ <code>Promise</code>
<p>Get information about the MenuItem with the given id</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <MenuItemPartial> the MenuItem with the given id  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| menuId | <code>string</code> | <p>the id of the MenuItem to retrieve</p> |

<a name="getApplicationMenu"></a>

## getApplicationMenu(electronApp) ⇒ <code>Promise</code>
<p>Get the current state of the application menu. Contains only primitive values and submenus..
Very similar to menu
<a href="https://www.electronjs.org/docs/latest/api/menu#examples">construction template structure</a>
in Electron.</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <MenuItemPartial[]> an array of MenuItem-like objects  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |

<a name="findMenuItem"></a>

## findMenuItem(electronApp, property, value, menuItems) ⇒ <code>Promise</code>
<p>Find a MenuItem by any of its properties</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <MenuItemPartial> the first MenuItem with the given property and value  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| property | <code>string</code> | <p>the property to search for</p> |
| value | <code>string</code> | <p>the value to search for</p> |
| menuItems | <code>MenuItemPartial</code> \| <code>Array.&lt;MenuItemPartial&gt;</code> | <p>optional - single MenuItem or array - if not provided, will be retrieved from the application menu</p> |

<a name="waitForMenuItem"></a>

## waitForMenuItem(electronApp, id) ⇒ <code>Promise</code>
<p>Wait for a MenuItem to be exist</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <void> resolves when the MenuItem is found  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| id | <code>string</code> | <p>the id of the MenuItem to wait for</p> |

<a name="waitForMenuItemStatus"></a>

## waitForMenuItemStatus(electronApp, id, property, value) ⇒ <code>Promise</code>
<p>Wait for a MenuItem to have a specific attribute value.
For example, wait for a MenuItem to be enabled... or be visible.. etc</p>

**Kind**: global function  
**Category**: Menu  
**Fulfil**: <void> resolves when the MenuItem with correct status is found  

| Param | Type | Description |
| --- | --- | --- |
| electronApp | <code>ElectronApplication</code> | <p>the Electron application object (from Playwright)</p> |
| id | <code>string</code> | <p>the id of the MenuItem to wait for</p> |
| property | <code>string</code> | <p>the property to search for</p> |
| value | <code>string</code> \| <code>number</code> \| <code>boolean</code> | <p>the value to search for</p> |


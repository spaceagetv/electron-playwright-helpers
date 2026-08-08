/**
 * Explanatory text attached to errors whose own message names a symptom
 * without naming a cause or a fix, plus the machinery which attaches it.
 *
 * This module deliberately imports nothing. `find_parse_builds.ts` is pure
 * Node with no Playwright in it, and `utilities.ts` pulls in the whole of
 * `index.ts`, so a shared leaf module is the only place both can reach
 * without creating a require cycle.
 *
 * **Nothing here may contain a string from {@link teardownErrorMatch} or
 * {@link gcErrorMatch}.** Help text is appended to the error's own message,
 * and `retry()` matches those lists against the whole message, so a stray
 * quote would turn an error that should throw immediately into one that gets
 * retried - re-firing whatever side effects the call already had. There is a
 * unit test for exactly this.
 *
 * @ignore
 */

/**
 * Errors which mean the execution context went away *after* the call was
 * dispatched, i.e. the action most likely happened, and only the reply was
 * lost. When retries are disabled these are swallowed rather than thrown.
 *
 * @ignore
 */
export const teardownErrorMatch = [
  'context or browser has been closed',
  // Execution context was destroyed, most likely because of a navigation.
  'Execution context was destroyed',
  // "Cannot read properties of undefined (reading 'getOwnerBrowserWindow')"
  `reading 'getOwnerBrowserWindow'`,
]

/**
 * Errors which mean V8 garbage-collected the promise that Playwright was awaiting.
 *
 * Playwright sends `Runtime.callFunctionOn` with `awaitPromise: true`, and V8's
 * inspector tracks the promise it is awaiting through a *weak* handle
 * (`ProtocolPromiseHandler` in `v8/src/inspector/injected-script.cc`). If that
 * promise becomes unreachable in the target heap before it settles, the weak
 * callback fires and CDP answers "Promise was collected". Playwright >= 1.62
 * rewrites that to "Resulting promise was garbage collected."
 * (`crExecutionContext.ts::rewriteError`).
 *
 * In practice only the rewritten wording ever reaches a caller: Playwright
 * >= 1.62 replaces the error outright, and Playwright < 1.62 has no branch for
 * the raw message at all, so it falls through `rewriteError`'s catch-all and
 * arrives disguised as a teardown error - i.e. on those versions a collected
 * promise is still retried. The raw wording is kept here anyway, in case it is
 * ever surfaced directly.
 *
 * This is **not** a transient failure and is deliberately NOT in
 * `retryDefaults.errorMatch` - see the note on `retry()`.
 *
 * @ignore
 */
export const gcErrorMatch = [
  'Promise was collected',
  'promise was garbage collected',
]

/**
 * Attach explanatory text to an error.
 *
 * Appends to the original error rather than wrapping it, so its identity and
 * stack survive. `.stack` has to be rebuilt from its own frames afterwards:
 * V8 renders it lazily and then caches it, so a `.stack` that was already read
 * would keep the old message and the note would never appear in whatever a
 * test reporter prints. Playwright does the same dance in `rewriteErrorMessage()`.
 *
 * @param err - the error to explain. Non-Errors are replaced by a real Error,
 *   since there is nothing to append to.
 * @param help - the text to append, from this module
 * @param errString - a string rendering of `err`, used only for the non-Error case
 *
 * @ignore
 */
export function explainError(
  err: unknown,
  help: string,
  errString = String(err),
): unknown {
  if (!(err instanceof Error)) {
    return new Error(`${errString}\n\n${help}`)
  }
  // helpers call retry() internally, so a retry() around a helper sees an error
  // an inner retry() already explained - don't say it twice
  if (err.message.includes(help)) {
    return err
  }
  try {
    err.message = `${err.message}\n\n${help}`
  } catch {
    // a frozen error, or a subclass whose `message` is getter-only. Assigning
    // throws under "use strict" - the original error is worth more than the note
    return err
  }
  const frames = (err.stack?.split('\n') || []).filter((line) =>
    line.startsWith('    at '),
  )
  if (frames.length) {
    err.stack = [`${err.name}: ${err.message}`, ...frames].join('\n')
  }
  return err
}

/**
 * Every help string in this module, so the "must not contain a retry matcher"
 * invariant can be tested over all of them at once. Add new help here too.
 *
 * @ignore
 */
export const errorHelp = {
  /** appended to "Resulting promise was garbage collected." */
  gc: [
    'V8 collected the promise Playwright was awaiting before it could settle.',
    'Two different things produce this, and they want opposite responses:',
    '',
    '1. An evaluate() callback returned a promise that nothing in the target',
    '   process references - e.g. `evaluate(() => new Promise(() => {}))`. This is',
    '   deterministic, not flaky: it fails the same way every time, so retrying',
    '   only wastes the timeout. The callback body has ALREADY RUN - its side',
    '   effects happened and only the reply was lost, so a retry fires them twice.',
    '   Fix the callback: return a value, or a promise that something retains (an',
    '   Electron API call, a timer, an event listener), rather than one nothing',
    '   holds.',
    '',
    '2. A raw Playwright channel call - electronApp.browserWindow(),',
    '   JSHandle.getProperty() and friends - lost an internal promise mid-flight.',
    '   You wrote no callback here, so there is nothing to fix in your code. This',
    '   one IS transient and worth retrying.',
    '',
    'The message is identical either way, so this library cannot tell them apart',
    'and does not retry by default - silently repeating a side effect is the worse',
    'failure. If yours is case 2, opt in per call. Note that errorMatch REPLACES',
    'the default list rather than extending it, so repeat the defaults you still',
    'want. See the README.',
  ].join('\n'),

  /** appended to `retry()`'s own timeout error */
  retryTimeout: [
    'retry() called the function until its timeout ran out. The "Last throw"',
    'above is the error from the final attempt, and almost certainly from every',
    'attempt before it, so that error is the thing to fix - this timeout is only',
    'the symptom of it repeating.',
    '',
    'If the last throw is a real failure in your app or your test - a menu item',
    'that does not exist, an IPC channel nobody registered, a window that never',
    'opened - then retrying was never going to help. Fix that condition, or wait',
    'for it explicitly with the matching waitFor* helper.',
    '',
    'If the app was simply slower than the timeout, raise it: pass',
    '{ timeout: 15000 } to this call, or call setRetryOptions({ timeout: 15000 })',
    'to raise it for every later call in this process, and resetRetryOptions()',
    'to put it back.',
    '',
    'If retry() should be retrying an error it currently does not, list that',
    'error in the errorMatch option. Note that errorMatch REPLACES the default',
    'list rather than extending it, so repeat the defaults you still want. See',
    'the README.',
  ].join('\n'),

  /** appended to `addTimeoutToPromise()`'s default timeout error */
  addTimeout: [
    'The promise did not settle in time. addTimeoutToPromise() only stops',
    'waiting - it cannot cancel the work, which keeps running and may fail or',
    'log on its own later, after the test that started it has moved on.',
    '',
    'Raise timeoutMs if the operation is legitimately slow. If you cannot tell',
    'which call this was, pass timeoutMessage (the third argument to both',
    'addTimeoutToPromise() and addTimeout()) to name it. If the promise never',
    'settles at all, the problem is in the wrapped call rather than in the',
    'timeout - await it directly, without addTimeoutToPromise(), to see the',
    'error it produces on its own.',
  ].join('\n'),

  /** appended when `findLatestBuild()` finds no build directory */
  findLatestBuild: [
    'findLatestBuild() looks one level down for directories whose name contains',
    'a hyphen-delimited platform - "my-app-darwin-arm64", "my-app-win32-x64" -',
    'and returns the most recently modified one. It found none.',
    '',
    'Package the app before running the tests: "npm run package" with',
    'electron-forge, or your packager of choice, and check that its output',
    'landed in the directory named above. If your builds go somewhere else,',
    'pass that directory: findLatestBuild("dist"). If your build directory name',
    'contains no platform, skip this function and hand the path straight to',
    'parseElectronApp("out/my-app").',
  ].join('\n'),

  /** appended when `parseElectronApp()` cannot read a platform from the dir name */
  parsePlatform: [
    'parseElectronApp() reads the platform out of the build directory name,',
    'which has to contain one of win/win32/windows, darwin/mac/macos/osx or',
    'linux/ubuntu/debian. That is what electron-forge and electron-packager',
    'produce by default, e.g. "my-app-darwin-arm64".',
    '',
    'Either rename the build directory to include the platform, or point this',
    'function straight at the app instead of at its parent directory - a path',
    'ending in ".app" or ".exe" tells it the platform without any name parsing.',
  ].join('\n'),

  /** appended when `ipcMainInvokeHandler()` finds no registered handler */
  ipcMainInvokeHandler: [
    "ipcMainInvokeHandler() looks the channel up in ipcMain's private",
    '_invokeHandlers map, which holds only the channels registered through',
    'ipcMain.handle(). Nothing was registered under this one when the call ran.',
    '',
    'Check the channel name first - it is matched exactly, and calling',
    'ipcMain.on() where you meant ipcMain.handle() puts the channel somewhere',
    'this function cannot see. If the handler is registered lazily - inside',
    'app.whenReady(), when a window opens, or in a module that has not been',
    'imported yet - then the test simply got there first, so wait for whatever',
    'triggers the registration before calling this. To call a channel that is',
    'genuinely registered with ipcMain.on(), use ipcMainEmit() or',
    'ipcMainCallFirstListener() instead.',
  ].join('\n'),

  /** appended when the app has no `Menu.setApplicationMenu()` menu installed */
  noApplicationMenu: [
    'Every menu helper here reads the APPLICATION menu, the one installed with',
    'Menu.setApplicationMenu(). Menu.getApplicationMenu() returned null, so',
    'either nothing has been installed yet or the menu under test is a different',
    'kind of menu entirely.',
    '',
    'A context menu - built with Menu.buildFromTemplate() and shown with',
    'menu.popup() - and a Tray menu are never reachable this way, no matter how',
    'they are built. Those have to be driven through whatever code opens them.',
    '',
    'If the app does install an application menu, but installs it late (inside',
    'app.whenReady(), or when the first window opens), the test just got there',
    'first: wait for the item with waitForMenuItem(electronApp, "my-item")',
    'instead of reading the menu immediately after launch.',
    '',
    'Also worth checking on Windows and Linux: an app that never calls',
    'Menu.setApplicationMenu() has no application menu at all there, even though',
    'the very same app shows a default menu on macOS.',
  ].join('\n'),

  /** appended when no menu item has the requested id */
  menuItemNotFound: [
    'Menu.getMenuItemById() searches the whole application menu, submenus',
    'included, and compares ids exactly - the match is case-sensitive and a',
    'stray space counts. So either the id is spelled differently than the',
    'template spells it, or the item is not in the menu at this moment.',
    '',
    'Print what is really there rather than guessing:',
    'getApplicationMenu(electronApp) returns the entire menu as plain data, ids',
    'and all. Keep in mind that only items given an explicit `id` in the',
    'template have one - an item declared purely by role does not, and has to be',
    'matched some other way, e.g. clickMenuItem(electronApp, "role", "copy").',
    '',
    'If the menu is built or rebuilt while the test runs, wait for the item',
    'rather than demanding it immediately: waitForMenuItem(electronApp,',
    '"my-item") resolves once it shows up.',
  ].join('\n'),

  /** appended when a menu item exists but the requested attribute is undefined */
  menuItemAttribute: [
    'The menu item was found; the property on it came back undefined. Two quite',
    'different things produce that.',
    '',
    'Usually the property is simply not set. Most MenuItem properties are',
    'undefined unless the template supplied them, and several are meaningful',
    'only for one type of item - `checked` on an item that is not a checkbox or',
    'radio, `submenu` on a plain item.',
    '',
    'It can also mean the value was dropped on the way out of the main process,',
    'because only serializable values survive that trip. Functions never arrive',
    '- `click` above all - and anything that failed to convert is recorded under',
    '`serializationErrors` on the object getMenuItemById(electronApp, id)',
    'returns. Look there before concluding the property is absent, and read the',
    'icon through that same object, where a NativeImage arrives as a data URL.',
  ].join('\n'),

  /** appended when no menu item matches a property/value pair */
  menuItemByProperty: [
    'No item in the application menu had that property set to that value.',
    'Matching is a strict === against a serialized copy of the menu, so a number',
    'does not match its string form, `true` does not match "true", and a RegExp',
    'is compared as an object rather than applied as a pattern. (`role` is the',
    'one exception: it is lower-cased before comparing.)',
    '',
    'Print the menu with getApplicationMenu(electronApp) and match against what',
    'is actually in it. Properties that cannot cross out of the main process are',
    'not there to match on at all: functions such as `click` are stripped, and an',
    '`icon` arrives as a data URL rather than as a NativeImage.',
    '',
    'If the item has an id, prefer clickMenuItemById() or getMenuItemById() -',
    'they ask Electron for the item directly instead of scanning a copy, so they',
    'are both faster and harder to get wrong.',
  ].join('\n'),

  /** appended when a matched menu item carries no `commandId` to click through */
  menuItemNoCommandId: [
    'The item matched, but it carries no commandId. clickMenuItem() needs one:',
    'it matches against a serialized copy of the menu out here, then uses the',
    'commandId to find the real item again inside the main process.',
    '',
    'Check `serializationErrors` on the object findMenuItem(electronApp,',
    'property, value) returns - if commandId is listed there, that is the',
    'reason, and the item itself is fine.',
    '',
    'Otherwise the match probably landed somewhere unintended: a property and',
    'value shared by several entries can match a separator or a submenu header',
    'rather than the clickable item you meant. Narrow the match, or - if the',
    'item has an id - use clickMenuItemById(), which skips this lookup and its',
    'failure mode entirely.',
  ].join('\n'),

  /** appended when `waitForWindowBy*()` times out */
  waitForWindow: [
    'No window already open matched, and no window that opened during the wait',
    'matched either.',
    '',
    'Print what the app actually has open before matching: electronApp.windows()',
    'returns the current pages, and page.url() and await page.title() are the',
    'exact values these helpers test. A window which has not finished navigating',
    'reports an empty url and an empty title, so match on something that is set',
    'early, or raise the timeout. String patterns match by substring and are',
    'case-sensitive; a RegExp is tested as given, so check its anchors and flags.',
  ].join('\n'),
}

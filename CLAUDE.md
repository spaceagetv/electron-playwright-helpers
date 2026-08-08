# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`electron-playwright-helpers` — an npm library of helper functions for testing Electron apps with Playwright. Published from `src/` → `dist/`. Node 18+ required (uses `structuredClone()`).

## Commands

Two separate npm projects: the library at the root, and `example-project/` (an electron-forge app used as the e2e fixture). Both need installing:

```bash
npm ci && cd example-project && npm ci
```

| Task | Command |
| --- | --- |
| Build (compile + regenerate README) | `npm run make` |
| Compile only | `npm run make:compile` |
| Unit tests (mocha + `node:assert/strict`, no Electron) | `npm run test:unit` |
| Single unit test | `npx mocha --require ts-node/register --timeout 5000 './test/**/*.ts' --exit --grep "retry"` |
| E2E tests (packages the app first via `pree2e`) | `npm run test:e2e` |
| Single e2e test | `cd example-project && npx playwright test -g "test name"` |
| E2E without repackaging | `cd example-project && npx playwright test` |
| Lint / fix | `npm run lint` / `npm run lint:fix` |
| Types | `npm run type-check` |

`npm test` runs unit then e2e. E2E needs a packaged build in `example-project/out/` — `npm run package` (electron-forge) creates it, and `findLatestBuild()` locates it at test time. On Linux/CI, e2e runs under `xvfb-run` (see `.github/workflows/e2e-ci.yml`).

**README.md is generated** — `npm run make:doc` renders `readme-template.hbs.md` + JSDoc from `src/*.ts` via jsdoc2md. Never hand-edit README.md; edit the template or the JSDoc comments.

Releases are automatic: semantic-release on `main` (and prerelease on `beta`) driven by Conventional Commit messages. Don't bump versions manually or edit `docs/CHANGELOG.md`.

## Architecture

Every helper is a thin wrapper around `electronApp.evaluate()` or `page.evaluate()`, and nearly all of them are wrapped in `retry()`. `src/index.ts` just re-exports each module.

### `retry()` is the backbone — `src/utilities.ts`

Since Electron 27, Playwright's `evaluate()` throws spurious context errors. `retry()` retries *only* errors whose message matches `retryDefaults.errorMatch` in `src/utilities.ts` — a list of substrings taken from Playwright's own messages — and rethrows everything else immediately.

**Those substrings are coupled to Playwright's internals**, specifically `rewriteError()` in `crExecutionContext.ts`, which rewrites raw CDP errors into user-facing ones. When Playwright rewords a message the list stops matching, and the symptom downstream is "sudden flakiness" after a Playwright upgrade. Read that function in the installed `playwright-core` before concluding a helper is at fault. The fix belongs in the `errorMatch` list, not in individual helpers, and should be additive — older Playwright versions may still emit the previous wording. `setRetryOptions()` / `getRetryOptions()` / `resetRetryOptions()` mutate a module-level singleton (`currentRetryOptions`), so changes are global and persist across tests until reset.

#### Two different failures hide behind those messages — only one is retryable

**Teardown (`teardownErrorMatch`) — transient, retry it.** The execution context a call was dispatched into went away. Playwright cannot recover from this on the Electron *main* process: `ElectronApplication` resolves `_nodeElectronHandlePromise` exactly once, on the first `Runtime.executionContextCreated`, to a `JSHandle` for `require('electron')`, and never re-acquires it — `_nodeSession` listens only for `Runtime.executionContextCreated` and `Runtime.consoleAPICalled`, never `executionContextDestroyed`. Pages get proper re-acquire machinery (`Frame.contextCreated/contextDestroyed` swaps in a fresh `ManualPromise` per world); `ElectronApplication` gets none. Retrying from the outside is the only lever available. Note also that `rewriteError()`'s last branch is a **catch-all**: any CDP error that is neither a JS-error-in-evaluate nor session-closed becomes "Execution context was destroyed, most likely because of a navigation", so that one string covers an unknown set of underlying protocol errors.

**Garbage-collected promise (`gcErrorMatch`) — deterministic, do NOT retry it.** Playwright sends `Runtime.callFunctionOn` with `awaitPromise: true`; V8's inspector tracks the awaited promise through a *weak* handle (`ProtocolPromiseHandler`, `v8/src/inspector/injected-script.cc`), so a promise that nothing in the target heap references gets collected before it settles and CDP answers "Promise was collected". Measured behavior on Playwright 1.62.1 / Electron 35, main process and renderer alike:

- Reproduces 100% (`evaluate(() => new Promise(() => {}))` plus allocation churn); realistic async evaluates are immune (0 failures in 300 iterations with forced GC at the await point) because Electron's native promises are held by a strong `v8::Global`.
- **The callback body already ran** — synchronous work and timer-rooted async side effects all completed; only the reply was lost. Retrying re-fires those side effects.
- Context teardown never produces this message: V8's `InjectedScript::discardEvaluateCallbacks` sends an explicit `Execution context was destroyed.` at the same moment, winning the race by construction (0 occurrences in 95 teardown trials across navigation, reload and close).

**Those measurements cover one population — a promise the *user's* evaluate callback returned and nothing retains.** A second population wears the identical message: raw Playwright channel calls (`electronApp.browserWindow()`, `JSHandle.getProperty()`) losing an internal promise mid-flight, where no user callback exists at all. That one is genuinely transient and retrying does help — the Visibox suite (`test/e2e/utils/retryThroughGC.ts`) wraps exactly those reads and relies on it. Since the message is the same, `retry()` cannot separate them; it fails fast because re-firing a side effect is the worse failure, and `gcErrorHelp` describes both cases so the caller can tell which one they have. Don't "simplify" that help text back down to the callback story.

Only Playwright >= 1.62 surfaces this by name. Earlier versions have no `rewriteError` branch for the raw CDP message, so it falls through the catch-all and arrives wearing the teardown wording — on those versions a collected promise is still retried, and there is nothing this library can do to tell it apart.

So it is excluded from `retryDefaults.errorMatch` and thrown immediately with `gcErrorHelp` appended (see `explainGcError()`, which also rebuilds `.stack` — V8 caches the rendered stack, so mutating `.message` alone leaves the note invisible to test reporters). Rooting the promise in the target *does* prevent collection, but only converts the error into a hang — a collected promise was never going to settle. Don't "fix" it that way. Upstream: [playwright#41826](https://github.com/microsoft/playwright/issues/41826), where the maintainers declined to retain the promise and shipped only the friendlier wording in [#41868](https://github.com/microsoft/playwright/pull/41868).

`retryUntilTruthy()` layers polling-for-truthiness on top of `retry()`; its `retry*`-prefixed options are forwarded to the inner `retry()` call.

### The evaluate boundary rules everything

Code inside an `evaluate()` callback is serialized and executed inside the Electron process. Consequences that shape the whole codebase:

- **No closures over module scope.** Any helper the callback needs must be declared *inside* the callback (see `cleanMenuItem` nested in `getMenuItemById`, `src/menu_helpers.ts`).
- **Only serializable data crosses.** Hence the `*Partial` / `Serialized*` types: `MenuItemPartial` strips functions and circular refs, `SerializedNativeImage` turns a `NativeImage` into a data URL, and `toSerializableMatcher()` (`src/dialog_matchers.ts`) converts RegExp matchers to `{source, flags}` so they survive the trip and get rebuilt on the other side.
- Type assertions and `@ts-ignore` are common at these boundaries by necessity.

### Module map

- `utilities.ts` — `retry`, `retryUntilTruthy`, retry option singleton, `addTimeout*`, `errToString`, `isRetryOptions`.
- `general_helpers.ts` — `evaluateWithRetry`, `electronWaitForFunction` (the main-process analogue of `page.waitForFunction()`); menu/window waiters build on it.
- `ipc_helpers.ts` — renderer-side (`ipcRendererSend/Invoke/Emit/CallFirstListener`) and main-side (`ipcMainEmit`, `ipcMainCallFirstListener`, `ipcMainInvokeHandler`). `ipcMainInvokeHandler` reaches into Electron's private `ipcMain._invokeHandlers` map and handles both the Electron ≤24 (`event._reply`) and ≥25 (return value) shapes.
- `menu_helpers.ts` — click/read/wait on application menu items; does the serialization work described above.
- `dialog_helpers.ts` — `stubDialog` / `stubMultipleDialogs` / `stubAllDialogs` monkeypatch methods on Electron's `dialog` module in the main process so no real dialog opens.
- `dialog_matchers.ts` — conditional stubbing (`stubDialogMatchers` / `clearDialogMatchers`): match on the dialog's options (title, message, buttons…) and return different values per match.
- `window_helpers.ts` — `getWindowBy{Url,Title,Matcher}` and `waitForWindowBy*`, with overloads returning one `Page` or all matches.
- `find_parse_builds.ts` — pure Node (`fs` + `@electron/asar`), no Playwright. `findLatestBuild()` picks the newest hyphen-delimited platform dir under `out/`; `parseElectronApp()` reads the packaged app (including inside `app.asar`) and returns executable/main paths.

### Variadic + options arg pattern

IPC helpers take `...args: (unknown | RetryOptions)[]` and sniff the last argument with `isRetryOptions()` to decide whether it's retry options or a real IPC argument. `isRetryOptions()` returns true when *every* key of the object is a valid retry-option key — so adding a new field to `RetryOptions` widens what gets swallowed as options rather than passed to the app.

## Tests

- `test/*.ts` — unit tests (mocha + `node:assert/strict`, config in `.mocharc.json`). They cover `retry`, `retryUntilTruthy`, and utilities; no Electron involved. There is no assertion library: `assert.rejects(promise, { message: /.../ })` is how "rejects with this message" is spelled, and the RegExp form is deliberate — it keeps the substring semantics `chai-as-promised`'s `rejectedWith()` had.
- `example-project/e2e-tests/*.spec.ts` — Playwright tests that import **`../../src`, not `dist`** (with `// <-- replace with 'electron-playwright-helpers'` comments, since these files double as user-facing examples). Editing `src/` changes e2e behavior without a rebuild. `example-project/e2e-tests/app-manager.ts` shares the launched `ElectronApplication` across spec files.
- `example-project/playwright.config.ts` uses `workers: 1`; the root `playwright.config.ts` points at the same testDir for running e2e from the repo root or VS Code (`.vscode/launch.json` has an "E2E Tests" config).

## Style

Prettier (no semicolons, single quotes, 2 spaces) enforced via eslint-plugin-prettier — run `npm run lint:fix`. `@typescript-eslint/no-explicit-any` and `ban-ts-comment` are off; the evaluate boundary needs them.

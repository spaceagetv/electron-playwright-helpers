# ElectronWindowHelper Implementation Plan

## Current Analysis

The user provided an `ElectronWindowHelper` class with these methods:
- `getAllWindows()` - get all windows
- `getWindowByUrlFragment()` / `getWindowsByUrlFragment()` - find by URL
- `getWindowByTitleFragment()` / `getWindowsByTitleFragment()` - find by title
- `getWindowByMatcher()` / `getWindowsByMatcher()` - find by custom matcher
- `waitForWindowByMatcher()` - wait for window matching criteria
- `waitForWindowByUrlFragment()` / `waitForWindowByTitleFragment()` - wait shortcuts

## Key Issues with Current Design

1. **Class-based** - The library uses standalone functions, not classes
2. **Duplication** - Singular/plural variants repeat identical matching logic
3. **Verbose** - Many methods that could be unified with options
4. **Console.log calls** - Debug logging shouldn't be in library code
5. **Complex waitFor** - The polling + event approach is overly complicated
6. **No retry integration** - Doesn't use the library's `RetryOptions` pattern

## Proposed Simplified API

Convert to standalone functions matching library conventions:

### Core Functions

```typescript
// Types
type WindowMatcher = (page: Page) => boolean | Promise<boolean>

interface WindowOptions extends Partial<RetryOptions> {
  /** Return all matches instead of just the first */
  all?: boolean
}

interface WaitForWindowOptions extends Partial<RetryOptions> {
  /** Timeout in ms (default: 10000) */
  timeout?: number
  /** Polling interval in ms (default: 200) */
  interval?: number
}

// 1. Get window(s) by URL pattern
function getWindowByUrl(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: WindowOptions
): Promise<Page | Page[] | undefined>

// 2. Get window(s) by title pattern
function getWindowByTitle(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: WindowOptions
): Promise<Page | Page[] | undefined>

// 3. Get window(s) by custom matcher
function getWindowByMatcher(
  electronApp: ElectronApplication,
  matcher: WindowMatcher,
  options?: WindowOptions
): Promise<Page | Page[] | undefined>

// 4. Wait for window by URL pattern
function waitForWindowByUrl(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: WaitForWindowOptions
): Promise<Page>

// 5. Wait for window by title pattern
function waitForWindowByTitle(
  electronApp: ElectronApplication,
  pattern: string | RegExp,
  options?: WaitForWindowOptions
): Promise<Page>

// 6. Wait for window by custom matcher
function waitForWindowByMatcher(
  electronApp: ElectronApplication,
  matcher: WindowMatcher,
  options?: WaitForWindowOptions
): Promise<Page>
```

### Simplifications Made

1. **No class** - Standalone functions matching library style
2. **Unified options** - Single options object with `all?: boolean` instead of separate methods
3. **Simpler pattern matching** - `string | RegExp` only (no array of strings)
   - Arrays add complexity; users can use RegExp: `/foo|bar/` instead of `['foo', 'bar']`
4. **Consistent naming** - `getWindowByUrl` not `getWindowByUrlFragment`
5. **No console.log** - Remove debug logging
6. **Uses RetryOptions** - Integrates with library's retry pattern
7. **Simpler wait logic** - Use Playwright's built-in `waitForEvent` with polling fallback

### Additional Features to Consider

1. **`getWindowCount()`** - Returns number of open windows
2. **`getMainWindow()`** - Gets the focused/main BrowserWindow
3. **`waitForWindowCount()`** - Wait until N windows are open

```typescript
function getWindowCount(
  electronApp: ElectronApplication,
  options?: Partial<RetryOptions>
): Promise<number>

function getMainWindow(
  electronApp: ElectronApplication,
  options?: Partial<RetryOptions>
): Promise<Page | undefined>

function waitForWindowCount(
  electronApp: ElectronApplication,
  count: number,
  options?: WaitForWindowOptions
): Promise<Page[]>
```

## Questions for User

1. **Options API**: For `getWindowBy*` functions, should we:
   - (A) Use `{ all?: boolean }` to toggle between returning first vs all matches
   - (B) Keep separate `getWindowBy*` and `getWindowsBy*` functions (more explicit)

2. **Pattern matching**: Is removing array support (`['foo', 'bar']`) okay?
   - Users can use RegExp instead: `/foo|bar/`

3. **Additional helpers**: Which of these would be useful?
   - `getWindowCount()` - get number of windows
   - `getMainWindow()` - get the focused window
   - `waitForWindowCount()` - wait for N windows
   - `closeAllWindows()` - close all windows except main

4. **TypeScript overloads**: Should we use overloads for better type inference?
   ```typescript
   function getWindowByUrl(app, pattern): Promise<Page | undefined>
   function getWindowByUrl(app, pattern, { all: true }): Promise<Page[]>
   ```

## File Structure

- Create `src/window_helpers.ts` with all functions
- Export from `src/index.ts`
- Add tests in `test/window_helpers.spec.ts`
- Update README with documentation

## Implementation Notes

1. Use `electronApp.windows()` to get all Page objects
2. Use `page.url()` and `page.title()` for matching
3. For waitFor functions, combine:
   - `electronApp.waitForEvent('window', { predicate })` for new windows
   - Polling existing windows to catch already-open windows
4. Integrate with library's `retry()` utility for resilience
5. Handle edge case where URL is empty (use `page.waitForURL()`)

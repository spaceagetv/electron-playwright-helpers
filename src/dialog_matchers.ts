import { ElectronApplication } from 'playwright-core'

/**
 * A serializable pattern for matching dialog options.
 * Strings match exactly (case-sensitive), regex patterns are serialized as {source, flags}.
 */
export type StringMatcher =
  | string
  | { source: string; flags: string }
  | undefined

/**
 * Convert a string or RegExp to a serializable StringMatcher.
 * RegExp objects cannot be transferred via Playwright's evaluate(),
 * so we serialize them as {source, flags}.
 */
export function toSerializableMatcher(
  pattern: string | RegExp | undefined
): StringMatcher {
  if (pattern === undefined) return undefined
  if (typeof pattern === 'string') return pattern
  return { source: pattern.source, flags: pattern.flags }
}

/**
 * Check if a value matches a StringMatcher.
 * Used inside app.evaluate() where the matcher is already serialized.
 */
export function matchesPattern(
  value: string | undefined,
  pattern: StringMatcher
): boolean {
  if (pattern === undefined) return true
  if (value === undefined) return false
  if (typeof pattern === 'string') {
    return value === pattern
  }
  // It's a serialized regex
  const regex = new RegExp(pattern.source, pattern.flags)
  return regex.test(value)
}

// ============================================================================
// Dialog Option Types for Matching
// ============================================================================

/**
 * Matchable options for showMessageBox/showMessageBoxSync.
 * All properties are optional - only provided properties will be matched.
 */
export type MessageBoxMatcher = {
  /** Match against MessageBoxOptions.type ('none' | 'info' | 'error' | 'question' | 'warning') */
  type?: string | RegExp
  /** Match against MessageBoxOptions.message */
  message?: string | RegExp
  /** Match against MessageBoxOptions.title */
  title?: string | RegExp
  /** Match against MessageBoxOptions.detail */
  detail?: string | RegExp
  /** Match against MessageBoxOptions.checkboxLabel */
  checkboxLabel?: string | RegExp
  /** Match against any button text in MessageBoxOptions.buttons array */
  buttons?: string | RegExp
}

/**
 * Matchable options for showOpenDialog/showOpenDialogSync.
 */
export type OpenDialogMatcher = {
  /** Match against OpenDialogOptions.title */
  title?: string | RegExp
  /** Match against OpenDialogOptions.defaultPath */
  defaultPath?: string | RegExp
  /** Match against OpenDialogOptions.buttonLabel */
  buttonLabel?: string | RegExp
  /** Match against OpenDialogOptions.message (macOS) */
  message?: string | RegExp
}

/**
 * Matchable options for showSaveDialog/showSaveDialogSync.
 */
export type SaveDialogMatcher = {
  /** Match against SaveDialogOptions.title */
  title?: string | RegExp
  /** Match against SaveDialogOptions.defaultPath */
  defaultPath?: string | RegExp
  /** Match against SaveDialogOptions.buttonLabel */
  buttonLabel?: string | RegExp
  /** Match against SaveDialogOptions.message (macOS) */
  message?: string | RegExp
  /** Match against SaveDialogOptions.nameFieldLabel (macOS) */
  nameFieldLabel?: string | RegExp
}

/**
 * Matchable options for showErrorBox.
 */
export type ErrorBoxMatcher = {
  /** Match against the title parameter */
  title?: string | RegExp
  /** Match against the content parameter */
  content?: string | RegExp
}

/**
 * Matchable options for showCertificateTrustDialog.
 */
export type CertificateTrustDialogMatcher = {
  /** Match against CertificateTrustDialogOptions.message */
  message?: string | RegExp
}

// ============================================================================
// Serializable Matcher Types (for crossing evaluate boundary)
// ============================================================================

export type SerializedMessageBoxMatcher = {
  type?: StringMatcher
  message?: StringMatcher
  title?: StringMatcher
  detail?: StringMatcher
  checkboxLabel?: StringMatcher
  buttons?: StringMatcher
}

export type SerializedOpenDialogMatcher = {
  title?: StringMatcher
  defaultPath?: StringMatcher
  buttonLabel?: StringMatcher
  message?: StringMatcher
}

export type SerializedSaveDialogMatcher = {
  title?: StringMatcher
  defaultPath?: StringMatcher
  buttonLabel?: StringMatcher
  message?: StringMatcher
  nameFieldLabel?: StringMatcher
}

export type SerializedErrorBoxMatcher = {
  title?: StringMatcher
  content?: StringMatcher
}

export type SerializedCertificateTrustDialogMatcher = {
  message?: StringMatcher
}

// ============================================================================
// Dialog Method Matcher Types
// ============================================================================

/**
 * Return value type for showMessageBox
 */
export type MessageBoxReturnValue = {
  response: number
  checkboxChecked: boolean
}

/**
 * Return value type for showOpenDialog
 */
export type OpenDialogReturnValue = {
  canceled: boolean
  filePaths: string[]
  bookmarks?: string[]
}

/**
 * Return value type for showSaveDialog
 */
export type SaveDialogReturnValue = {
  canceled: boolean
  filePath?: string
  bookmark?: string
}

/**
 * A matcher stub for showMessageBox.
 */
export type MessageBoxMatcherStub = {
  method: 'showMessageBox'
  matcher: MessageBoxMatcher
  value: Partial<MessageBoxReturnValue>
}

/**
 * A matcher stub for showMessageBoxSync.
 */
export type MessageBoxSyncMatcherStub = {
  method: 'showMessageBoxSync'
  matcher: MessageBoxMatcher
  value: number
}

/**
 * A matcher stub for showOpenDialog.
 */
export type OpenDialogMatcherStub = {
  method: 'showOpenDialog'
  matcher: OpenDialogMatcher
  value: Partial<OpenDialogReturnValue>
}

/**
 * A matcher stub for showOpenDialogSync.
 */
export type OpenDialogSyncMatcherStub = {
  method: 'showOpenDialogSync'
  matcher: OpenDialogMatcher
  value: string[] | undefined
}

/**
 * A matcher stub for showSaveDialog.
 */
export type SaveDialogMatcherStub = {
  method: 'showSaveDialog'
  matcher: SaveDialogMatcher
  value: Partial<SaveDialogReturnValue>
}

/**
 * A matcher stub for showSaveDialogSync.
 */
export type SaveDialogSyncMatcherStub = {
  method: 'showSaveDialogSync'
  matcher: SaveDialogMatcher
  value: string | undefined
}

/**
 * A matcher stub for showErrorBox.
 */
export type ErrorBoxMatcherStub = {
  method: 'showErrorBox'
  matcher: ErrorBoxMatcher
  value: void
}

/**
 * A matcher stub for showCertificateTrustDialog.
 */
export type CertificateTrustDialogMatcherStub = {
  method: 'showCertificateTrustDialog'
  matcher: CertificateTrustDialogMatcher
  value: void
}

/**
 * Union type of all dialog matcher stubs.
 */
export type DialogMatcherStub =
  | MessageBoxMatcherStub
  | MessageBoxSyncMatcherStub
  | OpenDialogMatcherStub
  | OpenDialogSyncMatcherStub
  | SaveDialogMatcherStub
  | SaveDialogSyncMatcherStub
  | ErrorBoxMatcherStub
  | CertificateTrustDialogMatcherStub

// ============================================================================
// Serialized Matcher Stub Types (for crossing evaluate boundary)
// ============================================================================

type SerializedMessageBoxMatcherStub = {
  method: 'showMessageBox'
  matcher: SerializedMessageBoxMatcher
  value: MessageBoxReturnValue
}

type SerializedMessageBoxSyncMatcherStub = {
  method: 'showMessageBoxSync'
  matcher: SerializedMessageBoxMatcher
  value: number
}

type SerializedOpenDialogMatcherStub = {
  method: 'showOpenDialog'
  matcher: SerializedOpenDialogMatcher
  value: OpenDialogReturnValue
}

type SerializedOpenDialogSyncMatcherStub = {
  method: 'showOpenDialogSync'
  matcher: SerializedOpenDialogMatcher
  value: string[] | undefined
}

type SerializedSaveDialogMatcherStub = {
  method: 'showSaveDialog'
  matcher: SerializedSaveDialogMatcher
  value: SaveDialogReturnValue
}

type SerializedSaveDialogSyncMatcherStub = {
  method: 'showSaveDialogSync'
  matcher: SerializedSaveDialogMatcher
  value: string | undefined
}

type SerializedErrorBoxMatcherStub = {
  method: 'showErrorBox'
  matcher: SerializedErrorBoxMatcher
  value: void
}

type SerializedCertificateTrustDialogMatcherStub = {
  method: 'showCertificateTrustDialog'
  matcher: SerializedCertificateTrustDialogMatcher
  value: void
}

type SerializedDialogMatcherStub =
  | SerializedMessageBoxMatcherStub
  | SerializedMessageBoxSyncMatcherStub
  | SerializedOpenDialogMatcherStub
  | SerializedOpenDialogSyncMatcherStub
  | SerializedSaveDialogMatcherStub
  | SerializedSaveDialogSyncMatcherStub
  | SerializedErrorBoxMatcherStub
  | SerializedCertificateTrustDialogMatcherStub

// ============================================================================
// Default Return Values
// ============================================================================

type DialogMatcherDefaults = {
  showMessageBox: MessageBoxReturnValue
  showMessageBoxSync: number
  showOpenDialog: OpenDialogReturnValue
  showOpenDialogSync: string[]
  showSaveDialog: SaveDialogReturnValue
  showSaveDialogSync: string | undefined
  showErrorBox: void
  showCertificateTrustDialog: void
}

const dialogMatcherDefaults: DialogMatcherDefaults = {
  showMessageBox: { response: 0, checkboxChecked: false },
  showMessageBoxSync: 0,
  showOpenDialog: { canceled: false, filePaths: [] },
  showOpenDialogSync: [],
  showSaveDialog: { canceled: false, filePath: undefined },
  showSaveDialogSync: undefined,
  showErrorBox: undefined as void,
  showCertificateTrustDialog: undefined as void,
}

// ============================================================================
// Serialization Helpers
// ============================================================================

function serializeMessageBoxMatcher(
  matcher: MessageBoxMatcher
): SerializedMessageBoxMatcher {
  return {
    type: toSerializableMatcher(matcher.type),
    message: toSerializableMatcher(matcher.message),
    title: toSerializableMatcher(matcher.title),
    detail: toSerializableMatcher(matcher.detail),
    checkboxLabel: toSerializableMatcher(matcher.checkboxLabel),
    buttons: toSerializableMatcher(matcher.buttons),
  }
}

function serializeOpenDialogMatcher(
  matcher: OpenDialogMatcher
): SerializedOpenDialogMatcher {
  return {
    title: toSerializableMatcher(matcher.title),
    defaultPath: toSerializableMatcher(matcher.defaultPath),
    buttonLabel: toSerializableMatcher(matcher.buttonLabel),
    message: toSerializableMatcher(matcher.message),
  }
}

function serializeSaveDialogMatcher(
  matcher: SaveDialogMatcher
): SerializedSaveDialogMatcher {
  return {
    title: toSerializableMatcher(matcher.title),
    defaultPath: toSerializableMatcher(matcher.defaultPath),
    buttonLabel: toSerializableMatcher(matcher.buttonLabel),
    message: toSerializableMatcher(matcher.message),
    nameFieldLabel: toSerializableMatcher(matcher.nameFieldLabel),
  }
}

function serializeErrorBoxMatcher(
  matcher: ErrorBoxMatcher
): SerializedErrorBoxMatcher {
  return {
    title: toSerializableMatcher(matcher.title),
    content: toSerializableMatcher(matcher.content),
  }
}

function serializeCertificateTrustDialogMatcher(
  matcher: CertificateTrustDialogMatcher
): SerializedCertificateTrustDialogMatcher {
  return {
    message: toSerializableMatcher(matcher.message),
  }
}

function serializeMatcherStub(
  stub: DialogMatcherStub
): SerializedDialogMatcherStub {
  switch (stub.method) {
    case 'showMessageBox':
      return {
        method: 'showMessageBox',
        matcher: serializeMessageBoxMatcher(stub.matcher),
        value: {
          ...dialogMatcherDefaults.showMessageBox,
          ...stub.value,
        },
      }
    case 'showMessageBoxSync':
      return {
        method: 'showMessageBoxSync',
        matcher: serializeMessageBoxMatcher(stub.matcher),
        value: stub.value ?? dialogMatcherDefaults.showMessageBoxSync,
      }
    case 'showOpenDialog':
      return {
        method: 'showOpenDialog',
        matcher: serializeOpenDialogMatcher(stub.matcher),
        value: {
          ...dialogMatcherDefaults.showOpenDialog,
          ...stub.value,
        },
      }
    case 'showOpenDialogSync':
      return {
        method: 'showOpenDialogSync',
        matcher: serializeOpenDialogMatcher(stub.matcher),
        value: stub.value ?? dialogMatcherDefaults.showOpenDialogSync,
      }
    case 'showSaveDialog':
      return {
        method: 'showSaveDialog',
        matcher: serializeSaveDialogMatcher(stub.matcher),
        value: {
          ...dialogMatcherDefaults.showSaveDialog,
          ...stub.value,
        },
      }
    case 'showSaveDialogSync':
      return {
        method: 'showSaveDialogSync',
        matcher: serializeSaveDialogMatcher(stub.matcher),
        value: stub.value ?? dialogMatcherDefaults.showSaveDialogSync,
      }
    case 'showErrorBox':
      return {
        method: 'showErrorBox',
        matcher: serializeErrorBoxMatcher(stub.matcher),
        value: undefined,
      }
    case 'showCertificateTrustDialog':
      return {
        method: 'showCertificateTrustDialog',
        matcher: serializeCertificateTrustDialogMatcher(stub.matcher),
        value: undefined,
      }
  }
}

// ============================================================================
// Main API
// ============================================================================

export type StubDialogMatchersOptions = {
  /**
   * If true, throw an error when a dialog is shown that doesn't match any stub.
   * If false (default), return the default value for that dialog method.
   */
  throwOnUnmatched?: boolean
}

/**
 * Stub dialog methods with matchers that check dialog options before returning values.
 * This allows you to set up multiple different return values based on the dialog's
 * title, message, buttons, or other options.
 *
 * Matchers are checked in order - the first matching stub wins.
 * If no stub matches, either an error is thrown (if throwOnUnmatched is true)
 * or the default value is returned.
 *
 * @example
 * ```ts
 * // Set up multiple dialog stubs at the start of your test
 * await stubDialogMatchers(app, [
 *   {
 *     method: 'showMessageBox',
 *     matcher: { title: /delete/i, buttons: /yes/i },
 *     value: { response: 1 }, // Click "Yes" for delete dialogs
 *   },
 *   {
 *     method: 'showMessageBox',
 *     matcher: { title: /save/i },
 *     value: { response: 0 }, // Click "Save" for save dialogs
 *   },
 *   {
 *     method: 'showOpenDialog',
 *     matcher: { title: 'Select Image' },
 *     value: { filePaths: ['/path/to/image.png'], canceled: false },
 *   },
 *   {
 *     method: 'showOpenDialog',
 *     matcher: {}, // Match all other open dialogs
 *     value: { canceled: true },
 *   },
 * ])
 * ```
 *
 * @category Dialog
 *
 * @param app - The Playwright ElectronApplication instance.
 * @param stubs - Array of dialog matcher stubs to apply.
 * @param options - Optional configuration.
 * @returns A promise that resolves when the stubs are applied.
 */
export function stubDialogMatchers(
  app: ElectronApplication,
  stubs: DialogMatcherStub[],
  options: StubDialogMatchersOptions = {}
): Promise<void> {
  const { throwOnUnmatched = false } = options

  // Serialize all stubs for transfer across the evaluate boundary
  const serializedStubs = stubs.map(serializeMatcherStub)

  // Group stubs by method for efficient lookup
  const stubsByMethod = new Map<string, SerializedDialogMatcherStub[]>()
  for (const stub of serializedStubs) {
    const existing = stubsByMethod.get(stub.method) || []
    existing.push(stub)
    stubsByMethod.set(stub.method, existing)
  }

  const stubsGrouped = Object.fromEntries(stubsByMethod)
  const defaults = dialogMatcherDefaults

  return app.evaluate(
    ({ dialog }, { stubsGrouped, throwOnUnmatched, defaults }) => {
      // Helper to check if a value matches a pattern (runs inside Electron)
      const matchesPattern = (
        value: string | undefined,
        pattern: { source: string; flags: string } | string | undefined
      ): boolean => {
        if (pattern === undefined) return true
        if (value === undefined) return false
        if (typeof pattern === 'string') return value === pattern
        const regex = new RegExp(pattern.source, pattern.flags)
        return regex.test(value)
      }

      // Check if MessageBoxOptions match a serialized matcher
      const matchesMessageBox = (
        options: Electron.MessageBoxOptions | undefined,
        matcher: {
          type?: { source: string; flags: string } | string
          message?: { source: string; flags: string } | string
          title?: { source: string; flags: string } | string
          detail?: { source: string; flags: string } | string
          checkboxLabel?: { source: string; flags: string } | string
          buttons?: { source: string; flags: string } | string
        }
      ): boolean => {
        if (!options) return true
        if (!matchesPattern(options.type, matcher.type)) return false
        if (!matchesPattern(options.message, matcher.message)) return false
        if (!matchesPattern(options.title, matcher.title)) return false
        if (!matchesPattern(options.detail, matcher.detail)) return false
        if (!matchesPattern(options.checkboxLabel, matcher.checkboxLabel))
          return false
        if (matcher.buttons !== undefined && options.buttons) {
          // Check if any button matches
          const buttonMatches = options.buttons.some((btn) =>
            matchesPattern(btn, matcher.buttons)
          )
          if (!buttonMatches) return false
        }
        return true
      }

      // Check if OpenDialogOptions match a serialized matcher
      const matchesOpenDialog = (
        options: Electron.OpenDialogOptions | undefined,
        matcher: {
          title?: { source: string; flags: string } | string
          defaultPath?: { source: string; flags: string } | string
          buttonLabel?: { source: string; flags: string } | string
          message?: { source: string; flags: string } | string
        }
      ): boolean => {
        if (!options) return true
        if (!matchesPattern(options.title, matcher.title)) return false
        if (!matchesPattern(options.defaultPath, matcher.defaultPath))
          return false
        if (!matchesPattern(options.buttonLabel, matcher.buttonLabel))
          return false
        if (!matchesPattern(options.message, matcher.message)) return false
        return true
      }

      // Check if SaveDialogOptions match a serialized matcher
      const matchesSaveDialog = (
        options: Electron.SaveDialogOptions | undefined,
        matcher: {
          title?: { source: string; flags: string } | string
          defaultPath?: { source: string; flags: string } | string
          buttonLabel?: { source: string; flags: string } | string
          message?: { source: string; flags: string } | string
          nameFieldLabel?: { source: string; flags: string } | string
        }
      ): boolean => {
        if (!options) return true
        if (!matchesPattern(options.title, matcher.title)) return false
        if (!matchesPattern(options.defaultPath, matcher.defaultPath))
          return false
        if (!matchesPattern(options.buttonLabel, matcher.buttonLabel))
          return false
        if (!matchesPattern(options.message, matcher.message)) return false
        if (!matchesPattern(options.nameFieldLabel, matcher.nameFieldLabel))
          return false
        return true
      }

      // showMessageBox
      if (stubsGrouped['showMessageBox']) {
        const stubs = stubsGrouped['showMessageBox'] as Array<{
          matcher: {
            type?: { source: string; flags: string } | string
            message?: { source: string; flags: string } | string
            title?: { source: string; flags: string } | string
            detail?: { source: string; flags: string } | string
            checkboxLabel?: { source: string; flags: string } | string
            buttons?: { source: string; flags: string } | string
          }
          value: { response: number; checkboxChecked: boolean }
        }>
        dialog.showMessageBox = async (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.MessageBoxOptions
            | undefined,
          maybeOptions?: Electron.MessageBoxOptions
        ) => {
          // Handle optional BrowserWindow first argument
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.MessageBoxOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesMessageBox(options, stub.matcher)) {
              return stub.value
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showMessageBox with options: ${JSON.stringify(
                options
              )}`
            )
          }
          return defaults.showMessageBox
        }
      }

      // showMessageBoxSync
      if (stubsGrouped['showMessageBoxSync']) {
        const stubs = stubsGrouped['showMessageBoxSync'] as Array<{
          matcher: {
            type?: { source: string; flags: string } | string
            message?: { source: string; flags: string } | string
            title?: { source: string; flags: string } | string
            detail?: { source: string; flags: string } | string
            checkboxLabel?: { source: string; flags: string } | string
            buttons?: { source: string; flags: string } | string
          }
          value: number
        }>
        dialog.showMessageBoxSync = (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.MessageBoxOptions
            | undefined,
          maybeOptions?: Electron.MessageBoxOptions
        ) => {
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.MessageBoxOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesMessageBox(options, stub.matcher)) {
              return stub.value
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showMessageBoxSync with options: ${JSON.stringify(
                options
              )}`
            )
          }
          return defaults.showMessageBoxSync
        }
      }

      // showOpenDialog
      if (stubsGrouped['showOpenDialog']) {
        const stubs = stubsGrouped['showOpenDialog'] as Array<{
          matcher: {
            title?: { source: string; flags: string } | string
            defaultPath?: { source: string; flags: string } | string
            buttonLabel?: { source: string; flags: string } | string
            message?: { source: string; flags: string } | string
          }
          value: {
            canceled: boolean
            filePaths: string[]
            bookmarks?: string[]
          }
        }>
        dialog.showOpenDialog = async (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.OpenDialogOptions
            | undefined,
          maybeOptions?: Electron.OpenDialogOptions
        ) => {
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.OpenDialogOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesOpenDialog(options, stub.matcher)) {
              return stub.value
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showOpenDialog with options: ${JSON.stringify(
                options
              )}`
            )
          }
          return defaults.showOpenDialog
        }
      }

      // showOpenDialogSync
      if (stubsGrouped['showOpenDialogSync']) {
        const stubs = stubsGrouped['showOpenDialogSync'] as Array<{
          matcher: {
            title?: { source: string; flags: string } | string
            defaultPath?: { source: string; flags: string } | string
            buttonLabel?: { source: string; flags: string } | string
            message?: { source: string; flags: string } | string
          }
          value: string[] | undefined
        }>
        dialog.showOpenDialogSync = (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.OpenDialogOptions
            | undefined,
          maybeOptions?: Electron.OpenDialogOptions
        ) => {
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.OpenDialogOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesOpenDialog(options, stub.matcher)) {
              return stub.value
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showOpenDialogSync with options: ${JSON.stringify(
                options
              )}`
            )
          }
          return defaults.showOpenDialogSync
        }
      }

      // showSaveDialog
      if (stubsGrouped['showSaveDialog']) {
        const stubs = stubsGrouped['showSaveDialog'] as Array<{
          matcher: {
            title?: { source: string; flags: string } | string
            defaultPath?: { source: string; flags: string } | string
            buttonLabel?: { source: string; flags: string } | string
            message?: { source: string; flags: string } | string
            nameFieldLabel?: { source: string; flags: string } | string
          }
          value: { canceled: boolean; filePath?: string; bookmark?: string }
        }>
        dialog.showSaveDialog = async (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.SaveDialogOptions
            | undefined,
          maybeOptions?: Electron.SaveDialogOptions
        ) => {
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.SaveDialogOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesSaveDialog(options, stub.matcher)) {
              return stub.value
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showSaveDialog with options: ${JSON.stringify(
                options
              )}`
            )
          }
          return defaults.showSaveDialog
        }
      }

      // showSaveDialogSync
      if (stubsGrouped['showSaveDialogSync']) {
        const stubs = stubsGrouped['showSaveDialogSync'] as Array<{
          matcher: {
            title?: { source: string; flags: string } | string
            defaultPath?: { source: string; flags: string } | string
            buttonLabel?: { source: string; flags: string } | string
            message?: { source: string; flags: string } | string
            nameFieldLabel?: { source: string; flags: string } | string
          }
          value: string | undefined
        }>
        dialog.showSaveDialogSync = (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.SaveDialogOptions
            | undefined,
          maybeOptions?: Electron.SaveDialogOptions
        ) => {
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.SaveDialogOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesSaveDialog(options, stub.matcher)) {
              return stub.value
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showSaveDialogSync with options: ${JSON.stringify(
                options
              )}`
            )
          }
          return defaults.showSaveDialogSync
        }
      }

      // showErrorBox
      if (stubsGrouped['showErrorBox']) {
        const stubs = stubsGrouped['showErrorBox'] as Array<{
          matcher: {
            title?: { source: string; flags: string } | string
            content?: { source: string; flags: string } | string
          }
          value: void
        }>
        dialog.showErrorBox = (title: string, content: string) => {
          for (const stub of stubs) {
            if (
              matchesPattern(title, stub.matcher.title) &&
              matchesPattern(content, stub.matcher.content)
            ) {
              return
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showErrorBox with title: ${title}, content: ${content}`
            )
          }
        }
      }

      // showCertificateTrustDialog
      if (stubsGrouped['showCertificateTrustDialog']) {
        const stubs = stubsGrouped['showCertificateTrustDialog'] as Array<{
          matcher: {
            message?: { source: string; flags: string } | string
          }
          value: void
        }>
        dialog.showCertificateTrustDialog = async (
          windowOrOptions?:
            | Electron.BrowserWindow
            | Electron.CertificateTrustDialogOptions
            | undefined,
          maybeOptions?: Electron.CertificateTrustDialogOptions
        ) => {
          const options =
            maybeOptions ||
            (windowOrOptions &&
            !('webContents' in windowOrOptions) &&
            !('id' in windowOrOptions)
              ? (windowOrOptions as Electron.CertificateTrustDialogOptions)
              : undefined)

          for (const stub of stubs) {
            if (matchesPattern(options?.message, stub.matcher.message)) {
              return
            }
          }
          if (throwOnUnmatched) {
            throw new Error(
              `No matching stub for showCertificateTrustDialog with options: ${JSON.stringify(
                options
              )}`
            )
          }
        }
      }
    },
    { stubsGrouped, throwOnUnmatched, defaults }
  )
}

/**
 * Clear all dialog matcher stubs and restore original dialog methods.
 * Note: This requires the app to have stored the original methods,
 * which is not done by default. You may need to restart the app
 * to fully restore dialog functionality.
 *
 * @category Dialog
 *
 * @param app - The Playwright ElectronApplication instance.
 * @returns A promise that resolves when the stubs are cleared.
 */
export function clearDialogMatchers(app: ElectronApplication): Promise<void> {
  // Since we can't easily restore the original methods without storing them first,
  // the best we can do is stub them with pass-through that throws
  // Users should restart the app for full restoration
  return app.evaluate(({ dialog }) => {
    const notRestored = (method: string) => () => {
      throw new Error(
        `dialog.${method} was stubbed and cannot be restored. Restart the app to restore dialog functionality.`
      )
    }
    dialog.showMessageBox = notRestored(
      'showMessageBox'
    ) as typeof dialog.showMessageBox
    dialog.showMessageBoxSync = notRestored(
      'showMessageBoxSync'
    ) as typeof dialog.showMessageBoxSync
    dialog.showOpenDialog = notRestored(
      'showOpenDialog'
    ) as typeof dialog.showOpenDialog
    dialog.showOpenDialogSync = notRestored(
      'showOpenDialogSync'
    ) as typeof dialog.showOpenDialogSync
    dialog.showSaveDialog = notRestored(
      'showSaveDialog'
    ) as typeof dialog.showSaveDialog
    dialog.showSaveDialogSync = notRestored(
      'showSaveDialogSync'
    ) as typeof dialog.showSaveDialogSync
    dialog.showErrorBox = notRestored(
      'showErrorBox'
    ) as typeof dialog.showErrorBox
    dialog.showCertificateTrustDialog = notRestored(
      'showCertificateTrustDialog'
    ) as typeof dialog.showCertificateTrustDialog
  })
}

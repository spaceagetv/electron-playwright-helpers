import type { ElectronApplication } from 'playwright-core'
import { electronWaitForFunction } from './general_helpers'
import { RetryOptions, retry } from './utilities'

/**
 * Execute the `.click()` method on the element with the given id.
 * **NOTE:** All menu testing functions will only work with items in the
 * [application menu](https://www.electronjs.org/docs/latest/api/menu#menusetapplicationmenumenu).
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param id {string} - the id of the MenuItem to click
 * @returns {Promise<void>}
 * @fulfil {void} resolves with the result of the `click()` method - probably `undefined`
 */
export function clickMenuItemById(
  electronApp: ElectronApplication,
  id: string,
  options: Partial<RetryOptions> = {}
): Promise<unknown> {
  return retry(
    () =>
      electronApp.evaluate(({ Menu }, menuId) => {
        const menu = Menu.getApplicationMenu()
        if (!menu) {
          throw new Error('No application menu found')
        }
        const menuItem = menu.getMenuItemById(menuId)
        if (menuItem) {
          return menuItem.click()
        } else {
          throw new Error(`Menu item with id ${menuId} not found`)
        }
      }, id),
    { disable: true, ...options }
  )
}

/**
 * Click the first matching menu item by any of its properties. This is
 * useful for menu items that don't have an id. HOWEVER, this is not as fast
 * or reliable as using `clickMenuItemById()` if the menu item has an id.
 *
 *  **NOTE:** All menu testing functions will only work with items in the
 * [application menu](https://www.electronjs.org/docs/latest/api/menu#menusetapplicationmenumenu).
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param property {String} - a property of the MenuItem to search for
 * @param value {String | Number | Boolean} - the value of the property to search for
 * @returns {Promise<void>}
 * @fulfil {void} resolves with the result of the `click()` method - probably `undefined`
 */
export async function clickMenuItem<P extends keyof MenuItemPartial>(
  electronApp: ElectronApplication,
  property: P,
  value: MenuItemPartial[P],
  options: Partial<RetryOptions> = {}
): Promise<unknown> {
  const menuItem = await findMenuItem(electronApp, property, value)
  if (!menuItem) {
    throw new Error(`Menu item with ${property} = ${value} not found`)
  }
  if (menuItem.commandId === undefined) {
    throw new Error(`Menu item with ${property} = ${value} has no commandId`)
  }
  return await electronApp.evaluate(async ({ Menu }, commandId) => {
    const menu = Menu.getApplicationMenu()
    if (!menu) {
      throw new Error('No application menu found')
    }
    // recurse through the menu to find menu item with matching commandId
    function findMenuItem(
      menu: Electron.Menu,
      commandId: number
    ): Electron.MenuItem | undefined {
      for (const item of menu.items) {
        if (item.type === 'submenu' && item.submenu) {
          const found = findMenuItem(item.submenu, commandId)
          if (found) {
            return found
          }
        } else if (item.commandId === commandId) {
          return item
        }
      }
    }
    const mI = findMenuItem(menu, commandId)
    if (!mI) {
      throw new Error(`Menu item with commandId ${commandId} not found`)
    }
    if (!mI.click) {
      throw new Error(`Menu item has no click method`)
    }
    await mI.click()
  }, menuItem.commandId)
}

/**
 * Get a given attribute the MenuItem with the given id.
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param menuId {string} - the id of the MenuItem to retrieve the attribute from
 * @param attribute {string} - the attribute to retrieve
 * @returns {Promise<string>}
 * @fulfil {string} resolves with the attribute value
 */
export function getMenuItemAttribute<T extends keyof Electron.MenuItem>(
  electronApp: ElectronApplication,
  menuId: string,
  attribute: T,
  options: Partial<RetryOptions> = {}
): Promise<Electron.MenuItem[T]> {
  const attr = attribute as keyof Electron.MenuItem
  const resultPromise = retry(
    () =>
      electronApp.evaluate(
        ({ Menu }, { menuId, attr }) => {
          const menu = Menu.getApplicationMenu()
          if (!menu) {
            throw new Error('No application menu found')
          }
          const menuItem = menu.getMenuItemById(menuId)
          if (!menuItem) {
            throw new Error(`Menu item with id "${menuId}" not found`)
          } else if (menuItem[attr] === undefined) {
            throw new Error(
              `Menu item with id "${menuId}" has no attribute "${attr}"`
            )
          } else {
            return menuItem[attr]
          }
        },
        { menuId, attr }
      ),
    options
  )
  return resultPromise as Promise<Electron.MenuItem[T]>
}

/** Serializable value types that can be safely transferred via Playwright */
type SerializableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object
  | SerializableValue[]
  | { [key: string]: SerializableValue }

/** Serialized representation of an Electron.NativeImage converted successfully */
export type SerializedNativeImageSuccess = {
  type: 'NativeImage'
  dataURL: string
  size: { width: number; height: number }
  isEmpty: boolean
}

/** Serialized representation of an Electron.NativeImage converted with an error */
export type SerializedNativeImageError = {
  type: 'NativeImage'
  error: string
}

/** Serialized representation of an Electron.NativeImage */
export type SerializedNativeImage =
  | SerializedNativeImageSuccess
  | SerializedNativeImageError

/** Type guard to check if a SerializedNativeImage is a success case */
export function isSerializedNativeImageSuccess(
  image: SerializedNativeImage
): image is SerializedNativeImageSuccess {
  return 'dataURL' in image
}

/** Type guard to check if a SerializedNativeImage is an error case */
export function isSerializedNativeImageError(
  image: SerializedNativeImage
): image is SerializedNativeImageError {
  return 'error' in image
}

/**
 * A MenuItemConstructorOptions-like Electron MenuItem
 * containing serializable values (primitives, objects, arrays) but no circular references
 */
export type MenuItemPartial = {
  -readonly [K in keyof Electron.MenuItem]?: K extends 'icon'
    ? SerializedNativeImage | undefined
    : Electron.MenuItem[K] extends SerializableValue
    ? Electron.MenuItem[K]
    : SerializableValue
} & {
  submenu?: MenuItemPartial[]
}

/**
 * Get information about the MenuItem with the given id. Returns serializable values including
 * primitives, objects, arrays, and other non-recursive data structures.
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param menuId {string} - the id of the MenuItem to retrieve
 * @returns {Promise<MenuItemPartial>}
 * @fulfil {MenuItemPartial} the MenuItem with the given id
 */
export function getMenuItemById(
  electronApp: ElectronApplication,
  menuId: string,
  options: Partial<RetryOptions> = {}
): Promise<MenuItemPartial> {
  return retry(
    () =>
      electronApp.evaluate(
        ({ Menu }, { menuId }) => {
          // we need this function to be in scope/context for the electronApp.evaluate
          function cleanMenuItem(
            menuItem: Electron.MenuItem,
            visited = new WeakSet()
          ): MenuItemPartial {
            // Check for circular references
            if (visited.has(menuItem)) {
              return { id: menuItem.id, label: '[Circular Reference]' }
            }
            visited.add(menuItem)

            const returnValue = {} as Record<string, SerializableValue>

            Object.entries(menuItem).forEach(([k, v]) => {
              const key = k as keyof Electron.MenuItem
              const value = v as Electron.MenuItem[keyof Electron.MenuItem]
              try {
                if (value === null || value === undefined) {
                  returnValue[key] = value
                } else if (
                  typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean'
                ) {
                  returnValue[key] = value
                } else if (value instanceof Date) {
                  // Convert dates to ISO strings for serialization
                  returnValue[key] = value.toISOString()
                } else if (
                  value &&
                  typeof value === 'object' &&
                  value.constructor &&
                  value.constructor.name === 'NativeImage'
                ) {
                  // Handle nativeImage objects by converting to data URL
                  try {
                    returnValue[key] = {
                      type: 'NativeImage',
                      dataURL: (value as Electron.NativeImage).toDataURL(),
                      size: (value as Electron.NativeImage).getSize(),
                      isEmpty: (value as Electron.NativeImage).isEmpty(),
                    }
                  } catch (imageError) {
                    returnValue[key] = {
                      type: 'NativeImage',
                      error: 'Failed to serialize image',
                    }
                  }
                } else if (
                  (Array.isArray(value) && key !== 'submenu') ||
                  typeof value === 'object'
                ) {
                  returnValue[key] = structuredClone(value)
                }
                // Skip functions and other non-serializable types
              } catch (error) {
                // Skip properties that can't be accessed or serialized
              }
            })

            if (menuItem.type === 'submenu' && menuItem.submenu) {
              returnValue['submenu'] = menuItem.submenu.items.map((item) =>
                cleanMenuItem(item, visited)
              )
            }

            return returnValue as MenuItemPartial
          }

          const menu = Menu.getApplicationMenu()
          if (!menu) {
            throw new Error('No application menu found')
          }
          const menuItem = menu.getMenuItemById(menuId)
          if (menuItem) {
            const visited = new WeakSet<Electron.MenuItem>()
            return cleanMenuItem(menuItem, visited)
          } else {
            throw new Error(`Menu item with id ${menuId} not found`)
          }
        },
        { menuId }
      ),
    options
  )
}

/**
 * Get the current state of the application menu. Contains serializable values including
 * primitives, objects, arrays, and other non-recursive data structures.
 * Very similar to menu
 * [construction template structure](https://www.electronjs.org/docs/latest/api/menu#examples)
 * in Electron.
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @returns {Promise<MenuItemPartial[]>}
 * @fulfil {MenuItemPartial[]} an array of MenuItem-like objects
 */
export function getApplicationMenu(
  electronApp: ElectronApplication,
  options: Partial<RetryOptions> = {}
): Promise<MenuItemPartial[]> {
  return retry(
    () =>
      electronApp.evaluate(({ Menu }) => {
        // we need this function to be in scope/context for the electronApp.evaluate
        function cleanMenuItem(
          menuItem: Electron.MenuItem,
          visited = new WeakSet()
        ): MenuItemPartial {
          // Check for circular references
          if (visited.has(menuItem)) {
            return { id: menuItem.id, label: '[Circular Reference]' }
          }
          visited.add(menuItem)

          const returnValue = {} as Record<string, SerializableValue>

          Object.entries(menuItem).forEach(([k, v]) => {
            const key = k as keyof Electron.MenuItem
            const value = v as Electron.MenuItem[keyof Electron.MenuItem]
            try {
              if (value === null || value === undefined) {
                returnValue[key] = value
              } else if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
              ) {
                returnValue[key] = value
              } else if (value instanceof Date) {
                // Convert dates to ISO strings for serialization
                returnValue[key] = value.toISOString()
              } else if (
                value &&
                typeof value === 'object' &&
                value.constructor &&
                value.constructor.name === 'NativeImage'
              ) {
                // Handle nativeImage objects by converting to data URL
                try {
                  returnValue[key] = {
                    type: 'NativeImage',
                    dataURL: (value as Electron.NativeImage).toDataURL(),
                    size: (value as Electron.NativeImage).getSize(),
                    isEmpty: (value as Electron.NativeImage).isEmpty(),
                  }
                } catch (imageError) {
                  returnValue[key] = {
                    type: 'NativeImage',
                    error: 'Failed to serialize image',
                  }
                }
              } else if (
                (Array.isArray(value) && key !== 'submenu') ||
                typeof value === 'object'
              ) {
                returnValue[key] = structuredClone(value)
              }
              // Skip functions and other non-serializable types
            } catch (error) {
              // Skip properties that can't be accessed or serialized
            }
          })

          if (menuItem.type === 'submenu' && menuItem.submenu) {
            returnValue['submenu'] = menuItem.submenu.items.map((item) =>
              cleanMenuItem(item, visited)
            )
          }

          return returnValue as MenuItemPartial
        }

        const menu = Menu.getApplicationMenu()
        if (!menu) {
          throw new Error('No application menu found')
        }
        const cleanItems = menu.items.map((item) => cleanMenuItem(item))

        return cleanItems
      }),
    options
  )
}

/**
 * Find a MenuItem by any of its properties
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param property {string} - the property to search for
 * @param value {string} - the value to search for
 * @param menuItems {MenuItemPartial | MenuItemPartial[]} optional - single MenuItem or array - if not provided, will be retrieved from the application menu
 * @returns {Promise<MenuItemPartial>}
 * @fulfil {MenuItemPartial} the first MenuItem with the given property and value
 */
export async function findMenuItem<P extends keyof MenuItemPartial>(
  electronApp: ElectronApplication,
  property: P,
  value: MenuItemPartial[P],
  menuItems?: MenuItemPartial | MenuItemPartial[]
): Promise<MenuItemPartial | undefined> {
  if (property === 'role') {
    // set the value to lowercase
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    value = value.toLowerCase()
  }
  if (!menuItems) {
    const menu = await getApplicationMenu(electronApp)
    return findMenuItem(electronApp, property, value, menu)
  }
  if (Array.isArray(menuItems)) {
    for (const menuItem of menuItems) {
      const found = await findMenuItem(electronApp, property, value, menuItem)
      if (found) {
        return found
      }
    }
  } else {
    if (menuItems[property] === value) {
      return menuItems
    } else if (menuItems.submenu) {
      return findMenuItem(electronApp, property, value, menuItems.submenu)
    }
  }
}

/**
 * Wait for a MenuItem to exist
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param id {string} - the id of the MenuItem to wait for
 * @returns {Promise<void>}
 * @fulfil {void} resolves when the MenuItem is found
 */
export async function waitForMenuItem(
  electronApp: ElectronApplication,
  id: string
): Promise<void> {
  await electronWaitForFunction(
    electronApp,
    ({ Menu }, id) => {
      const menu = Menu.getApplicationMenu()
      if (!menu) {
        throw new Error('No application menu found')
      }
      return !!menu.getMenuItemById(id as string)
    },
    id
  )
}

/**
 * Wait for a MenuItem to have a specific attribute value.
 * For example, wait for a MenuItem to be enabled... or be visible.. etc
 *
 * @category Menu
 *
 * @param electronApp {ElectronApplication} - the Electron application object (from Playwright)
 * @param id {string} - the id of the MenuItem to wait for
 * @param property {string} - the property to search for
 * @param value {string | number | boolean} - the value to search for
 * @returns {Promise<void>}
 * @fulfil {void} resolves when the MenuItem with correct status is found
 */
export async function waitForMenuItemStatus<P extends keyof Electron.MenuItem>(
  electronApp: ElectronApplication,
  id: string,
  property: P,
  value: Electron.MenuItem[P]
): Promise<void> {
  if (property === 'role') {
    // set the value to lowercase
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    value = value.toLowerCase()
  }
  await electronWaitForFunction(
    electronApp,
    ({ Menu }, { id, value, property }) => {
      const menu = Menu.getApplicationMenu()
      if (!menu) {
        throw new Error('No application menu found')
      }
      const menuItem = menu.getMenuItemById(id)
      if (!menuItem) {
        throw new Error(`Menu item with id "${id}" not found`)
      }
      return menuItem[property] === value
    },
    { id, value, property }
  )
}

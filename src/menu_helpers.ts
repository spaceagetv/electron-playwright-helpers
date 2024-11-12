import type { ElectronApplication } from 'playwright-core'
import {
  electronWaitForFunction,
  evaluateWithRetry,
  EvaluateWithRetryOptions,
} from './general_helpers'

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
  options: EvaluateWithRetryOptions = {}
): Promise<unknown> {
  return evaluateWithRetry(
    electronApp,
    ({ Menu }, menuId) => {
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
    },
    id,
    options
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
  options: EvaluateWithRetryOptions = {}
): Promise<unknown> {
  const menuItem = await findMenuItem(electronApp, property, value)
  if (!menuItem) {
    throw new Error(`Menu item with ${property} = ${value} not found`)
  }
  return await evaluateWithRetry(
    electronApp,
    async ({ Menu }, commandId) => {
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
    },
    menuItem.commandId,
    options
  )
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
  options: EvaluateWithRetryOptions = {}
): Promise<Electron.MenuItem[T]> {
  const attr = attribute as keyof Electron.MenuItem
  const resultPromise = evaluateWithRetry(
    electronApp,
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
    { menuId, attr },
    options
  )
  return resultPromise as Promise<Electron.MenuItem[T]>
}

// https://stackoverflow.com/a/69756175/14350317
type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value | undefined ? P : never]: T[P]
}

/** Limit to just primitive MenuItem attributes */
type MenuItemPrimitive = PickByType<
  Electron.MenuItem,
  string | number | boolean | null
>

/**
 * A MenuItemConstructorOptions-like Electron MenuItem
 * containing only primitive and null values
 */
export type MenuItemPartial = MenuItemPrimitive & {
  submenu?: MenuItemPartial[]
}

/**
 * Get information about the MenuItem with the given id
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
  options: EvaluateWithRetryOptions = {}
): Promise<MenuItemPartial> {
  return evaluateWithRetry(
    electronApp,
    ({ Menu }, { menuId }) => {
      // we need this function to be in scope
      function cleanMenuItem(menuItem: Electron.MenuItem): MenuItemPartial {
        const returnValue = {} as MenuItemPartial
        Object.entries(menuItem).forEach(([key, value]) => {
          // if value is a primitive
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            value === null
          ) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            returnValue[key] = value
          }
        })
        if (menuItem.type === 'submenu' && menuItem.submenu) {
          returnValue['submenu'] = menuItem.submenu.items.map(cleanMenuItem)
        }
        return returnValue
      }
      const menu = Menu.getApplicationMenu()
      if (!menu) {
        throw new Error('No application menu found')
      }
      const menuItem = menu.getMenuItemById(menuId)
      if (menuItem) {
        return cleanMenuItem(menuItem)
      } else {
        throw new Error(`Menu item with id ${menuId} not found`)
      }
    },
    { menuId },
    options
  )
}

/**
 * Get the current state of the application menu. Contains only primitive values and submenus..
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
  options: EvaluateWithRetryOptions = {}
): Promise<MenuItemPartial[] | undefined> {
  const promise = evaluateWithRetry(
    electronApp,
    ({ Menu }) => {
      // we need this function to be in scope
      function cleanMenuItem(menuItem: Electron.MenuItem): MenuItemPartial {
        const returnValue = {} as MenuItemPartial
        Object.entries(menuItem).forEach(([key, value]) => {
          // if value is a primitive
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            value === null
          ) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - we know it's a primitive
            returnValue[key] = value
          }
        })
        if (menuItem.type === 'submenu' && menuItem.submenu) {
          returnValue['submenu'] = menuItem.submenu.items.map(cleanMenuItem)
        }
        return returnValue
      }

      const menu = Menu.getApplicationMenu()
      if (!menu) {
        throw new Error('No application menu found')
      }
      const cleanItems = menu.items.map(cleanMenuItem)

      return cleanItems
    },
    {},
    options
  )
  return promise
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

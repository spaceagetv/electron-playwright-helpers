import type { ElectronApplication } from '../../node_modules/playwright-core' // <-- replace with 'playwright-core'

let electronApp: ElectronApplication

export function setApp(app: ElectronApplication) {
  electronApp = app
}

export function getApp() {
  return electronApp
}

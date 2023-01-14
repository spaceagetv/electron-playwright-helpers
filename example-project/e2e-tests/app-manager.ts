import { ElectronApplication } from '../../node_modules/playwright' // <-- replace with 'playwright'

let electronApp: ElectronApplication

export function setApp(app: ElectronApplication) {
  electronApp = app
}

export function getApp() {
  return electronApp
}

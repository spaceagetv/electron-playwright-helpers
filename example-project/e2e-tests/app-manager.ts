import { ElectronApplication } from 'playwright'

let electronApp: ElectronApplication

export function setApp(app: ElectronApplication) {
  electronApp = app
}

export function getApp() {
  return electronApp
}

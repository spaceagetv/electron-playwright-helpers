import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './e2e-tests',
  maxFailures: 2,
  workers: 1,
}

export default config

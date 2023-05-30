import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  maxFailures: 2,
  reporter: process.env.CI ? 'github' : 'list',
  testDir: './e2e-tests',
}

export default config

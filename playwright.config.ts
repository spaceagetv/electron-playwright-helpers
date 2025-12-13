import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './example-project/e2e-tests',
  maxFailures: 2,
})

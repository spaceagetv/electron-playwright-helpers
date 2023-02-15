/**
 * Example Playwright script for Electron
 * showing/testing various API features
 * for finding and parsing builds.
 */

import { expect, test } from '@playwright/test'

import path from 'path'

// We're importing the library from the root of the project,
// but if you use this in your own project, you should
// import from 'electron-playwright-helpers'
import { findLatestBuild } from '../../src' // <-- replace with 'electron-playwright-helpers'

function runTests({ out_dir = 'out' }: { out_dir?: string }) {
  const build = findLatestBuild(out_dir)
  expect(build).toBeTruthy()
  expect(build.startsWith(path.join(process.cwd(), 'out'))).toEqual(true)
}

test('findLatestBuild: no path', () => {
  runTests({})
})

test('findLatestBuild: "out"', () => {
  runTests({ out_dir: 'out' })
})

test('findLatestBuild: "./out"', () => {
  runTests({ out_dir: './out' })
})

test('findLatestBuild: "path.join(process.cwd(), \'out\')"', () => {
  console.log(path.join(process.cwd(), 'out'))
  runTests({ out_dir: path.join(process.cwd(), 'out') })
})

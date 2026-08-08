import assert from 'node:assert/strict'
import type { ElectronApplication } from 'playwright-core'
import { electronWaitForFunction } from '../src/general_helpers'

/** the only thing electronWaitForFunction() touches is evaluate() */
function fakeApp(evaluate: () => Promise<unknown>): ElectronApplication {
  return { evaluate } as unknown as ElectronApplication
}

describe('electronWaitForFunction', () => {
  it('should resolve once the function returns true', async () => {
    let calls = 0
    const app = fakeApp(async () => ++calls >= 3)

    await electronWaitForFunction(app, () => true, undefined, {
      timeout: 1000,
      poll: 2,
    })

    assert.strictEqual(calls, 3)
  })

  it('should give up rather than polling forever', async () => {
    // a function that is never going to be true used to spin until Playwright's
    // own test timeout killed the run, with no indication of what was stuck
    const app = fakeApp(async () => false)

    await assert.rejects(
      electronWaitForFunction(app, () => false, undefined, {
        timeout: 50,
        poll: 2,
      }),
      { message: /Timeout/ },
    )
  })

  it('should still honor errorMatch, which used to reach retry() directly', async () => {
    let calls = 0
    const app = fakeApp(async () => {
      if (++calls < 3) {
        throw new Error('flaky thing happened')
      }
      return true
    })

    await electronWaitForFunction(app, () => true, undefined, {
      timeout: 1000,
      poll: 2,
      retryPoll: 2,
      errorMatch: 'flaky thing happened',
    })

    assert.strictEqual(calls, 3)
  })

  it('should throw an unmatched error instead of swallowing it', async () => {
    const app = fakeApp(async () => {
      throw new Error('No application menu found')
    })

    await assert.rejects(
      electronWaitForFunction(app, () => true, undefined, { timeout: 50 }),
      { message: /No application menu found/ },
    )
  })
})

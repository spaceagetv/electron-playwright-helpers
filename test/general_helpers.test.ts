import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import type { ElectronApplication } from 'playwright-core'
import { electronWaitForFunction } from '../src/general_helpers'

chai.use(chaiAsPromised)

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

    expect(calls).to.equal(3)
  })

  it('should give up rather than polling forever', async () => {
    // a function that is never going to be true used to spin until Playwright's
    // own test timeout killed the run, with no indication of what was stuck
    const app = fakeApp(async () => false)

    await expect(
      electronWaitForFunction(app, () => false, undefined, {
        timeout: 50,
        poll: 2,
      })
    ).to.be.rejectedWith('Timeout')
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

    expect(calls).to.equal(3)
  })

  it('should throw an unmatched error instead of swallowing it', async () => {
    const app = fakeApp(async () => {
      throw new Error('No application menu found')
    })

    await expect(
      electronWaitForFunction(app, () => true, undefined, { timeout: 50 })
    ).to.be.rejectedWith('No application menu found')
  })
})

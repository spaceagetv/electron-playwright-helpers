import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { retry, resetRetryOptions, setRetryOptions } from '../src/utilities'

chai.use(chaiAsPromised)

// Playwright >= 1.62 rewrites CDP's "Promise was collected" into this
const GC_ERROR = 'Resulting promise was garbage collected.'
// what Playwright throws when the context goes away
const TEARDOWN_ERROR = 'Target page, context or browser has been closed'

describe('retry', () => {
  afterEach(() => {
    resetRetryOptions()
  })

  describe('default errorMatch', () => {
    it('should retry a garbage-collected promise error', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        if (counter < 3) {
          throw new Error(GC_ERROR)
        }
        return counter
      }

      await expect(retry(fn, { poll: 2 })).to.eventually.equal(3)
    })

    it('should retry a "Promise was collected" error (Playwright < 1.62)', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        if (counter < 3) {
          throw new Error('Promise was collected')
        }
        return counter
      }

      await expect(retry(fn, { poll: 2 })).to.eventually.equal(3)
    })

    it('should retry a closed context error', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        if (counter < 3) {
          throw new Error(TEARDOWN_ERROR)
        }
        return counter
      }

      await expect(retry(fn, { poll: 2 })).to.eventually.equal(3)
    })
  })

  describe('disable', () => {
    it('should only call the function once', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        throw new Error(TEARDOWN_ERROR)
      }

      await retry(fn, { disable: true })

      expect(counter).to.equal(1)
    })

    it('should swallow a teardown error - the action already happened', async () => {
      const fn = async () => {
        throw new Error(TEARDOWN_ERROR)
      }

      await expect(retry(fn, { disable: true })).to.eventually.equal(undefined)
    })

    it('should throw a garbage-collected promise error rather than report success', async () => {
      const fn = async () => {
        throw new Error(GC_ERROR)
      }

      await expect(retry(fn, { disable: true })).to.be.rejectedWith(GC_ERROR)
    })

    it('should throw a non-matching error', async () => {
      const fn = async () => {
        throw new Error('Menu item with id nope not found')
      }

      await expect(retry(fn, { disable: true })).to.be.rejectedWith(
        'Menu item with id nope not found'
      )
    })

    it('should be honored when set globally via setRetryOptions()', async () => {
      setRetryOptions({ disable: true })
      let counter = 0
      const fn = async () => {
        counter++
        throw new Error(TEARDOWN_ERROR)
      }

      await retry(fn)

      expect(counter).to.equal(1)
    })
  })

  it('should retry a function until it succeeds', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      if (counter < 3) {
        throw new Error('Counter too low')
      }
      return counter
    }

    await expect(
      retry(fn, {
        poll: 'raf',
        errorMatch: 'Counter too low',
      })
    ).to.eventually.equal(3)
  })

  it('should reject if the function never succeeds', async () => {
    const fn = async () => {
      throw new Error('Always fails')
    }
    await expect(retry(fn, { poll: 10, timeout: 20 })).to.be.rejectedWith(
      'Always fails'
    )
  })

  it('should reject if the function throws an unexpected error', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('Unexpected error')
    }

    await expect(retry(fn, { timeout: 10 })).to.be.rejectedWith(
      'Unexpected error'
    )

    expect(counter).to.equal(1)
  })

  it('should retry the specified number of times', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('Always fails')
    }

    await expect(
      retry(fn, {
        timeout: 20,
        poll: 2,
        errorMatch: 'Always fails',
      })
    ).to.be.rejectedWith('Always fails')

    expect(counter).to.be.greaterThan(1)
  })

  it('should succeed immediately if the function succeeds on the first try', async () => {
    const fn = async () => {
      return 'success'
    }
    await expect(retry(fn)).to.eventually.equal('success')
  })

  it('should succeed immediately if the function succeeds on the first try with a non-zero interval', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      return 'success'
    }
    await expect(retry(fn)).to.eventually.equal('success')
    expect(counter).to.equal(1)
  })

  it('should timeout if the function never succeeds', async () => {
    const fn = async () => {
      throw new Error('Always fails')
    }
    await expect(
      retry(fn, {
        poll: 100,
        timeout: 50,
        errorMatch: 'Always fails',
      })
    ).to.be.rejectedWith('Timeout')
  })

  it('should retry if the error message matches a regular expression', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      if (counter < 5) {
        throw new Error('Something about counter too low or something')
      }
      return counter
    }

    await expect(
      retry(fn, {
        poll: 'raf',
        errorMatch: /counter too low/,
      })
    ).to.eventually.equal(5)
  })

  it('should keep matching a global RegExp across retries', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      if (counter < 4) {
        throw new Error('flaky thing happened')
      }
      return counter
    }

    // a /g RegExp carries lastIndex between test() calls
    await expect(
      retry(fn, { poll: 2, errorMatch: /flaky/g })
    ).to.eventually.equal(4)
  })

  it('should reject if the error message does not match a regular expression', async () => {
    const fn = async () => {
      throw new Error('Something else')
    }

    await expect(
      retry(fn, {
        timeout: 10,
        poll: 0,
        errorMatch: /counter too low/,
      })
    ).to.be.rejectedWith('Something else')
  })

  it('should reject if the error message does not include a string', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('B')
    }

    await expect(
      retry(fn, {
        timeout: 10,
        poll: 2,
        errorMatch: 'A',
      })
    ).to.be.rejectedWith('B')

    expect(counter).to.equal(1)
  })

  it('rejects properly for function that returns nested promises', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      return await Promise.reject(new Error('fail'))
    }

    await expect(
      retry(fn, { timeout: 1000, errorMatch: 'fail' })
    ).to.be.rejectedWith('fail')

    expect(counter).to.equal(5)
  })
})

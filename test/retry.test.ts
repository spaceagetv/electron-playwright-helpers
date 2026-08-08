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
    it('should NOT retry a garbage-collected promise error', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        throw new Error(GC_ERROR)
      }

      // deterministic, not flaky - every attempt fails identically, and the
      // callback body already ran, so retrying would re-fire its side effects
      await expect(retry(fn, { poll: 2 })).to.be.rejectedWith(GC_ERROR)

      expect(counter).to.equal(1)
    })

    it('should NOT retry the raw CDP "Promise was collected" wording', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        throw new Error('Promise was collected')
      }

      await expect(retry(fn, { poll: 2 })).to.be.rejectedWith(
        'Promise was collected'
      )

      expect(counter).to.equal(1)
    })

    it('should explain what a garbage-collected promise actually means', async () => {
      const fn = async () => {
        throw new Error(GC_ERROR)
      }

      await expect(retry(fn, { poll: 2 })).to.be.rejectedWith(
        /V8 collected the promise Playwright was awaiting/
      )
    })

    it('should put the explanation in the stack, not just the message', async () => {
      const fn = async () => {
        const err = new Error(GC_ERROR)
        // whatever reported this first would have rendered .stack by now, and
        // V8 caches it - the explanation has to survive that
        void err.stack
        throw err
      }

      const err = await retry(fn, { poll: 2 }).catch((e: Error) => e)

      expect(err.stack).to.include('V8 collected the promise')
    })

    it('should not repeat the explanation when retry() calls nest', async () => {
      // helpers call retry() internally, so retry(() => helper()) is a normal
      // composition and must not stack up the same paragraph twice
      const inner = () =>
        retry(
          async () => {
            throw new Error(GC_ERROR)
          },
          { poll: 2 }
        )

      const err = await retry(inner, { poll: 2 }).catch((e: Error) => e)

      const occurrences = err.message.split('V8 collected the promise')
      expect(occurrences).to.have.lengthOf(2) // i.e. the phrase appears once
    })

    it('should not claim an unrelated "garbage collected" message is ours', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        // someone else's assertion, not a collected evaluate promise
        throw new Error('cache was not garbage collected after 3s')
      }

      const err = await retry(fn, { poll: 2 }).catch((e: Error) => e)

      expect(err.message).to.equal('cache was not garbage collected after 3s')
      expect(counter).to.equal(1)
    })

    it('should retry a garbage-collected promise error if asked to', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        if (counter < 3) {
          throw new Error(GC_ERROR)
        }
        return counter
      }

      // the documented escape hatch
      await expect(
        retry(fn, { poll: 2, errorMatch: 'promise was garbage collected' })
      ).to.eventually.equal(3)
    })

    it('should not explain an error the caller opted into retrying', async () => {
      const fn = async () => {
        throw new Error(GC_ERROR)
      }

      const err = await retry(fn, {
        poll: 2,
        timeout: 10,
        errorMatch: 'promise was garbage collected',
      }).catch((e: Error) => e)

      // the caller's matcher wins, so this times out as a normal retry
      expect(err.message).to.include('Timeout')
      expect(err.message).to.not.include('V8 collected the promise')
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

  it('should not leave lastIndex set on a global RegExp it was given', async () => {
    const errorMatch = /flaky/g
    const fn = async () => {
      throw new Error('flaky thing happened')
    }

    await expect(
      retry(fn, { poll: 2, timeout: 10, errorMatch })
    ).to.be.rejectedWith('flaky thing happened')

    // the caller's RegExp is theirs - matching must not move its cursor
    expect(errorMatch.lastIndex).to.equal(0)
  })

  it('should keep a sticky RegExp sticky', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('flaky thing happened')
    }

    // /y anchors at lastIndex, which is 0 here, so this must NOT match a
    // message that says "flaky" further along - and a non-match throws at once
    await expect(
      retry(fn, { poll: 2, errorMatch: /flaky/y })
    ).to.be.rejectedWith('flaky thing happened')

    expect(counter).to.equal(1)
  })

  it('should fall back to the default errorMatch when given undefined', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      if (counter < 3) {
        throw new Error(TEARDOWN_ERROR)
      }
      return counter
    }

    await expect(
      retry(fn, { poll: 2, errorMatch: undefined })
    ).to.eventually.equal(3)
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

import assert from 'node:assert/strict'
import { retry, resetRetryOptions, setRetryOptions } from '../src/utilities'

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
      await assert.rejects(retry(fn, { poll: 2 }), {
        message: /Resulting promise was garbage collected\./,
      })

      assert.strictEqual(counter, 1)
    })

    it('should NOT retry the raw CDP "Promise was collected" wording', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        throw new Error('Promise was collected')
      }

      await assert.rejects(retry(fn, { poll: 2 }), {
        message: /Promise was collected/,
      })

      assert.strictEqual(counter, 1)
    })

    it('should explain what a garbage-collected promise actually means', async () => {
      const fn = async () => {
        throw new Error(GC_ERROR)
      }

      await assert.rejects(retry(fn, { poll: 2 }), {
        message: /V8 collected the promise Playwright was awaiting/,
      })
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

      assert.match(err.stack, /V8 collected the promise/)
    })

    it('should not repeat the explanation when retry() calls nest', async () => {
      // helpers call retry() internally, so retry(() => helper()) is a normal
      // composition and must not stack up the same paragraph twice
      const inner = () =>
        retry(
          async () => {
            throw new Error(GC_ERROR)
          },
          { poll: 2 },
        )

      const err = await retry(inner, { poll: 2 }).catch((e: Error) => e)

      const occurrences = err.message.split('V8 collected the promise')
      assert.strictEqual(occurrences.length, 2) // i.e. the phrase appears once
    })

    it('should not claim an unrelated "garbage collected" message is ours', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        // someone else's assertion, not a collected evaluate promise
        throw new Error('cache was not garbage collected after 3s')
      }

      const err = await retry(fn, { poll: 2 }).catch((e: Error) => e)

      assert.strictEqual(
        err.message,
        'cache was not garbage collected after 3s',
      )
      assert.strictEqual(counter, 1)
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
      assert.strictEqual(
        await retry(fn, {
          poll: 2,
          errorMatch: 'promise was garbage collected',
        }),
        3,
      )
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
      assert.match(err.message, /Timeout/)
      assert.doesNotMatch(err.message, /V8 collected the promise/)
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

      assert.strictEqual(await retry(fn, { poll: 2 }), 3)
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

      assert.strictEqual(counter, 1)
    })

    it('should swallow a teardown error - the action already happened', async () => {
      const fn = async () => {
        throw new Error(TEARDOWN_ERROR)
      }

      assert.strictEqual(await retry(fn, { disable: true }), undefined)
    })

    it('should throw a garbage-collected promise error rather than report success', async () => {
      const fn = async () => {
        throw new Error(GC_ERROR)
      }

      await assert.rejects(retry(fn, { disable: true }), {
        message: /Resulting promise was garbage collected\./,
      })
    })

    it('should throw a non-matching error', async () => {
      const fn = async () => {
        throw new Error('Menu item with id nope not found')
      }

      await assert.rejects(retry(fn, { disable: true }), {
        message: /Menu item with id nope not found/,
      })
    })

    it('should throw a matching error that is not a teardown error', async () => {
      let counter = 0
      const fn = async () => {
        counter++
        throw new Error('flaky thing happened')
      }

      // the error matches, so it isn't "your code is broken", but it also isn't
      // teardown - the context is still there, so nothing tells us whether the
      // action fired. Reporting success here would pass a test that never ran.
      await assert.rejects(
        retry(fn, { disable: true, errorMatch: 'flaky thing' }),
        { message: /flaky thing happened/ },
      )

      assert.strictEqual(counter, 1)
    })

    it('should throw a garbage-collected promise error the caller opted into retrying', async () => {
      const fn = async () => {
        throw new Error(GC_ERROR)
      }

      // opting into retrying GC errors takes them past the explain-and-throw
      // path, but disable: true means there is no retry left to make - and the
      // callback body already ran, so success is exactly what we can't claim
      await assert.rejects(
        retry(fn, {
          disable: true,
          errorMatch: 'promise was garbage collected',
        }),
        { message: /Resulting promise was garbage collected\./ },
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

      assert.strictEqual(counter, 1)
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

    assert.strictEqual(
      await retry(fn, {
        poll: 'raf',
        errorMatch: 'Counter too low',
      }),
      3,
    )
  })

  it('should reject if the function never succeeds', async () => {
    const fn = async () => {
      throw new Error('Always fails')
    }
    await assert.rejects(retry(fn, { poll: 10, timeout: 20 }), {
      message: /Always fails/,
    })
  })

  it('should reject if the function throws an unexpected error', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('Unexpected error')
    }

    await assert.rejects(retry(fn, { timeout: 10 }), {
      message: /Unexpected error/,
    })

    assert.strictEqual(counter, 1)
  })

  it('should retry the specified number of times', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('Always fails')
    }

    await assert.rejects(
      retry(fn, {
        timeout: 20,
        poll: 2,
        errorMatch: 'Always fails',
      }),
      { message: /Always fails/ },
    )

    assert.ok(counter > 1, `expected more than one attempt, got ${counter}`)
  })

  it('should succeed immediately if the function succeeds on the first try', async () => {
    const fn = async () => {
      return 'success'
    }
    assert.strictEqual(await retry(fn), 'success')
  })

  it('should succeed immediately if the function succeeds on the first try with a non-zero interval', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      return 'success'
    }
    assert.strictEqual(await retry(fn), 'success')
    assert.strictEqual(counter, 1)
  })

  it('should timeout if the function never succeeds', async () => {
    const fn = async () => {
      throw new Error('Always fails')
    }
    await assert.rejects(
      retry(fn, {
        poll: 100,
        timeout: 50,
        errorMatch: 'Always fails',
      }),
      { message: /Timeout/ },
    )
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

    assert.strictEqual(
      await retry(fn, {
        poll: 'raf',
        errorMatch: /counter too low/,
      }),
      5,
    )
  })

  it('should not leave lastIndex set on a global RegExp it was given', async () => {
    const errorMatch = /flaky/g
    const fn = async () => {
      throw new Error('flaky thing happened')
    }

    await assert.rejects(retry(fn, { poll: 2, timeout: 10, errorMatch }), {
      message: /flaky thing happened/,
    })

    // the caller's RegExp is theirs - matching must not move its cursor
    assert.strictEqual(errorMatch.lastIndex, 0)
  })

  it('should keep a sticky RegExp sticky', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('flaky thing happened')
    }

    // /y anchors at lastIndex, which is 0 here, so this must NOT match a
    // message that says "flaky" further along - and a non-match throws at once
    await assert.rejects(retry(fn, { poll: 2, errorMatch: /flaky/y }), {
      message: /flaky thing happened/,
    })

    assert.strictEqual(counter, 1)
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

    assert.strictEqual(await retry(fn, { poll: 2, errorMatch: undefined }), 3)
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
    assert.strictEqual(await retry(fn, { poll: 2, errorMatch: /flaky/g }), 4)
  })

  it('should reject if the error message does not match a regular expression', async () => {
    const fn = async () => {
      throw new Error('Something else')
    }

    await assert.rejects(
      retry(fn, {
        timeout: 10,
        poll: 0,
        errorMatch: /counter too low/,
      }),
      { message: /Something else/ },
    )
  })

  it('should reject if the error message does not include a string', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('B')
    }

    await assert.rejects(
      retry(fn, {
        timeout: 10,
        poll: 2,
        errorMatch: 'A',
      }),
      { message: /B/ },
    )

    assert.strictEqual(counter, 1)
  })

  it('rejects properly for function that returns nested promises', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      return await Promise.reject(new Error('fail'))
    }

    await assert.rejects(retry(fn, { timeout: 1000, errorMatch: 'fail' }), {
      message: /fail/,
    })

    assert.strictEqual(counter, 5)
  })
})

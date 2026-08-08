import assert from 'node:assert/strict'
import {
  errorHelp,
  explainError,
  gcErrorMatch,
  teardownErrorMatch,
} from '../src/error_help'
import { addTimeoutToPromise, retry } from '../src/utilities'

describe('error help', () => {
  describe('the retry-matcher invariant', () => {
    // Help text is APPENDED to the error's own message, and retry() matches its
    // errorMatch list case-insensitively against the whole message. A help
    // string quoting one of those matchers would make an error that should
    // throw immediately start being retried instead - re-firing whatever side
    // effects the call already had. Nothing may quote one, ever.
    const matchers = [...teardownErrorMatch, ...gcErrorMatch]

    for (const [name, help] of Object.entries(errorHelp)) {
      it(`errorHelp.${name} must not contain a retry matcher`, () => {
        const lowered = help.toLowerCase()
        for (const matcher of matchers) {
          assert.ok(
            !lowered.includes(matcher.toLowerCase()),
            `errorHelp.${name} contains the retry matcher "${matcher}", which ` +
              `would make errors carrying this help retryable`,
          )
        }
      })
    }

    it('should cover every help string', () => {
      assert.ok(Object.keys(errorHelp).length > 0)
    })
  })

  describe('explainError', () => {
    it('should append the help to the message and the stack', () => {
      const err = new Error('something broke')
      // whatever reported this first would have rendered .stack by now, and V8
      // caches it - the explanation has to survive that
      void err.stack

      const explained = explainError(err, 'here is why') as Error

      assert.strictEqual(explained, err)
      assert.match(explained.message, /something broke\n\nhere is why/)
      assert.match(explained.stack as string, /here is why/)
    })

    it('should not append the same help twice', () => {
      const err = explainError(new Error('nope'), 'here is why') as Error
      explainError(err, 'here is why')

      assert.strictEqual(err.message.split('here is why').length, 2)
    })

    it('should return a real Error when given something else', () => {
      const explained = explainError('just a string', 'here is why', 'rendered')

      assert.ok(explained instanceof Error)
      assert.strictEqual(explained.message, 'rendered\n\nhere is why')
    })

    it('should keep the original error when the message cannot be set', () => {
      const err = Object.freeze(new Error('frozen solid'))

      assert.strictEqual(explainError(err, 'here is why'), err)
      assert.strictEqual(err.message, 'frozen solid')
    })
  })

  describe('explained errors', () => {
    it('should explain a retry() timeout', async () => {
      const fn = async () => {
        throw new Error('Always fails')
      }

      const err = await retry(fn, {
        poll: 2,
        timeout: 10,
        errorMatch: 'Always fails',
      }).catch((e: Error) => e)

      assert.match(err.message, /Timeout after 10ms/)
      assert.match(err.message, /The "Last throw"/)
    })

    it('should explain an addTimeoutToPromise() timeout', async () => {
      await assert.rejects(addTimeoutToPromise(new Promise(() => null), 20), {
        message: /timeout after 20ms\n\nThe promise did not settle in time\./,
      })
    })

    it('should leave a caller-supplied timeout message alone', async () => {
      await assert.rejects(
        addTimeoutToPromise(new Promise(() => null), 20, 'my own message'),
        { message: 'my own message' },
      )
    })
  })
})

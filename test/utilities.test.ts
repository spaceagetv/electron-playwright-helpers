import assert from 'node:assert/strict'
import {
  addTimeoutToPromise,
  errToString,
  getRetryOptions,
  isRetryOptions,
  resetRetryOptions,
  setRetryOptions,
} from '../src/utilities'

describe('Utilities', () => {
  describe('addTimeoutToPromise', () => {
    it('should resolve the promise before timeout', async () => {
      const result = await addTimeoutToPromise(Promise.resolve('success'), 1000)
      assert.strictEqual(result, 'success')
    })

    it('should reject the promise after timeout', async () => {
      // the message is followed by an explanation - see error_help.test.ts
      await assert.rejects(addTimeoutToPromise(new Promise(() => null), 100), {
        message: /^timeout after 100ms$/m,
      })
    })
  })

  // describe('addTimeout', () => {
  //   it('should call the helper function and resolve before timeout', async () => {
  //     const helpers = {
  //       async testHelper() {
  //         return 'success'
  //       },
  //     }
  //     const name = 'testHelper' as HelperFunctionName
  //     const result = await addTimeout(name, 1000, undefined, helpers)
  //     expect(result).to.equal('success')
  //   })

  //   it('should call the helper function and reject after timeout', async () => {
  //     const helpers = {
  //       async testHelper() {
  //         return new Promise(() => {})
  //       },
  //     }
  //     try {
  //       await addTimeout('testHelper', 100, undefined, helpers)
  //     } catch (error) {
  //       expect(error.message).to.equal('timeout after 100ms')
  //     }
  //   })
  // })

  describe('setRetryOptions', () => {
    it('should set the retry options', () => {
      const options = setRetryOptions({ timeout: 10 })
      assert.strictEqual(options.timeout, 10)
    })
  })

  describe('getRetryOptions', () => {
    it('should get the current retry options', () => {
      resetRetryOptions()
      const options = getRetryOptions()
      assert.strictEqual(options.timeout, 5000)
    })
  })

  describe('resetRetryOptions', () => {
    it('should reset the retry options to default values', () => {
      setRetryOptions({ poll: 10 })
      resetRetryOptions()
      const options = getRetryOptions()
      assert.strictEqual(options.poll, 200)
    })
  })

  describe('isRetryOptions', () => {
    it('should not treat an empty array as retry options', () => {
      // Object.keys([]).every(...) is vacuously true and typeof [] === 'object',
      // so a trailing [] used to be popped off IPC helpers as retry options
      assert.strictEqual(isRetryOptions([]), false)
    })

    it('should not treat a non-empty array as retry options', () => {
      assert.strictEqual(isRetryOptions([1, 2]), false)
      assert.strictEqual(isRetryOptions(['timeout']), false)
    })

    it('should accept a retry-options object', () => {
      assert.strictEqual(isRetryOptions({ timeout: 1000 }), true)
      assert.strictEqual(isRetryOptions({ poll: 10, timeout: 100 }), true)
      assert.strictEqual(isRetryOptions({ disable: true }), true)
    })

    it('should reject objects with unknown keys', () => {
      assert.strictEqual(isRetryOptions({ timeout: 1000, extra: true }), false)
      assert.strictEqual(isRetryOptions({ foo: 1 }), false)
    })

    it('should reject null and non-objects', () => {
      assert.strictEqual(isRetryOptions(null), false)
      assert.strictEqual(isRetryOptions(undefined), false)
      assert.strictEqual(isRetryOptions(1), false)
      assert.strictEqual(isRetryOptions('timeout'), false)
    })

    it('should still treat an empty object as retry options', () => {
      // swallowing {} is what a caller passing no options would want
      assert.strictEqual(isRetryOptions({}), true)
    })
  })

  describe('errToString', () => {
    it('should convert an Error object to a string', () => {
      const error = new Error('test error')
      const result = errToString(error)
      assert.strictEqual(result, 'Error: test error')
    })

    it('should convert a TypeError to a string', () => {
      const error = new TypeError('test error')
      const result = errToString(error)
      assert.strictEqual(result, 'TypeError: test error')
    })

    it('should return the string directly if the error is a string', () => {
      const error = 'test error'
      const result = errToString(error)
      assert.strictEqual(result, 'test error')
    })

    it('should convert other types to a JSON string', () => {
      const error = { message: 'test error' }
      const result = errToString(error)
      assert.strictEqual(result, '{"message":"test error"}')
    })

    it('should still return a string for values JSON.stringify() skips', () => {
      // JSON.stringify() returns undefined for these, and callers go on to
      // call String methods on the result
      assert.strictEqual(typeof errToString(undefined), 'string')
      assert.strictEqual(typeof errToString(() => 'nope'), 'string')
      assert.strictEqual(typeof errToString(Symbol('nope')), 'string')
    })
  })
})

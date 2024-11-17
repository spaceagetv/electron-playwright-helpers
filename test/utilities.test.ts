import { expect } from 'chai'
import {
  addTimeoutToPromise,
  errToString,
  getRetryOptions,
  resetRetryOptions,
  setRetryOptions,
} from '../src/utilities'

describe('Utilities', () => {
  describe('addTimeoutToPromise', () => {
    it('should resolve the promise before timeout', async () => {
      const result = await addTimeoutToPromise(Promise.resolve('success'), 1000)
      expect(result).to.equal('success')
    })

    it('should reject the promise after timeout', async () => {
      try {
        await addTimeoutToPromise(new Promise(() => null), 100)
      } catch (error) {
        expect(error.message).to.equal('timeout after 100ms')
      }
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
      expect(options.timeout).to.equal(10)
    })
  })

  describe('getRetryOptions', () => {
    it('should get the current retry options', () => {
      resetRetryOptions()
      const options = getRetryOptions()
      expect(options.timeout).to.equal(5000)
    })
  })

  describe('resetRetryOptions', () => {
    it('should reset the retry options to default values', () => {
      setRetryOptions({ poll: 10 })
      resetRetryOptions()
      const options = getRetryOptions()
      expect(options.poll).to.equal(200)
    })
  })

  describe('errToString', () => {
    it('should convert an Error object to a string', () => {
      const error = new Error('test error')
      const result = errToString(error)
      expect(result).to.equal('Error: test error')
    })

    it('should convert a TypeError to a string', () => {
      const error = new TypeError('test error')
      const result = errToString(error)
      expect(result).to.equal('TypeError: test error')
    })

    it('should return the string directly if the error is a string', () => {
      const error = 'test error'
      const result = errToString(error)
      expect(result).to.equal('test error')
    })

    it('should convert other types to a JSON string', () => {
      const error = { message: 'test error' }
      const result = errToString(error)
      expect(result).to.equal('{"message":"test error"}')
    })
  })
})

import assert from 'node:assert/strict'
import { retryUntilTruthy } from '../src/utilities'

describe('retryUntilTruthy', () => {
  it('should return the result of the function', async () => {
    const result = await retryUntilTruthy(async () => 'success')
    assert.strictEqual(result, 'success')
  })

  it('should only call the function once if it returns a truthy value', async () => {
    let attempts = 0
    const result = await retryUntilTruthy(async () => {
      attempts++
      return 'success'
    })
    assert.strictEqual(result, 'success')
    assert.strictEqual(attempts, 1)
  })

  it('should retry the function until it returns a truthy value', async () => {
    let attempts = 0
    const result = await retryUntilTruthy(async () => {
      attempts++
      if (attempts < 3) {
        return false
      }
      return 'success'
    })
    assert.strictEqual(result, 'success')
    assert.strictEqual(attempts, 3)
  })

  it('should throw an error if timeout is reached', async () => {
    await assert.rejects(
      retryUntilTruthy(async () => false, { timeout: 100 }),
      {
        message: /Timeout after 100ms/,
      },
    )
  })

  it('should throw an error if the error does not match defaults', async () => {
    await assert.rejects(
      retryUntilTruthy(async () => {
        throw new Error('test error')
      }),
      { message: /test error/ },
    )
  })

  it('should throw an error if the error does not match custom errorMatch', async () => {
    await assert.rejects(
      retryUntilTruthy(
        async () => {
          throw new Error('test error')
        },
        { retryErrorMatch: 'custom error' },
      ),
      { message: /test error/ },
    )
  })

  it('should throw an error if the error does not match regex errorMatch', async () => {
    await assert.rejects(
      retryUntilTruthy(
        async () => {
          throw new Error('test error')
        },
        { retryErrorMatch: /custom error/ },
      ),
      { message: /test error/ },
    )
  })
})

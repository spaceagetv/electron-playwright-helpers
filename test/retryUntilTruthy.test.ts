import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { retryUntilTruthy } from '../src/utilities'

chai.use(chaiAsPromised)

describe('retryUntilTruthy', () => {
  it('should return the result of the function', async () => {
    const result = await retryUntilTruthy(async () => 'success')
    expect(result).to.equal('success')
  })

  it('should only call the function once if it returns a truthy value', async () => {
    let attempts = 0
    const result = await retryUntilTruthy(async () => {
      attempts++
      return 'success'
    })
    expect(result).to.equal('success')
    expect(attempts).to.equal(1)
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
    expect(result).to.equal('success')
    expect(attempts).to.equal(3)
  })

  it('should throw an error if timeout is reached', async () => {
    await expect(
      retryUntilTruthy(async () => false, { timeout: 100 })
    ).to.be.rejectedWith('Timeout after 100ms')
  })

  it('should throw an error if the error does not match defaults', async () => {
    await expect(
      retryUntilTruthy(async () => {
        throw new Error('test error')
      })
    ).to.be.rejectedWith('test error')
  })

  it('should throw an error if the error does not match custom errorMatch', async () => {
    await expect(
      retryUntilTruthy(
        async () => {
          throw new Error('test error')
        },
        { retryErrorMatch: 'custom error' }
      )
    ).to.be.rejectedWith('test error')
  })

  it('should throw an error if the error does not match regex errorMatch', async () => {
    await expect(
      retryUntilTruthy(
        async () => {
          throw new Error('test error')
        },
        { retryErrorMatch: /custom error/ }
      )
    ).to.be.rejectedWith('test error')
  })
})

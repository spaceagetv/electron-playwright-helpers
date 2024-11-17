import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { retry } from '../src/utilities'

chai.use(chaiAsPromised)

describe('retry', () => {
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

import assert from 'node:assert/strict'
import type { Page } from 'playwright-core'
import { ipcRendererInvoke } from '../src/ipc_helpers'

/** the only thing ipcRendererInvoke() needs from Page is evaluate() */
function fakePage(
  evaluate: (
    fn: unknown,
    payload: { message: string; args: unknown[] },
  ) => Promise<unknown>,
): Page {
  return { evaluate } as unknown as Page
}

describe('ipcRendererInvoke', () => {
  it('should pass a trailing empty array through as an IPC argument', async () => {
    let forwarded: unknown[] | undefined
    const page = fakePage(async (_fn, payload) => {
      forwarded = payload.args
      return 'ok'
    })

    await ipcRendererInvoke(page, 'create-thing', 'my-thing', [])

    assert.deepStrictEqual(forwarded, ['my-thing', []])
  })

  it('should pass a trailing non-empty array through as an IPC argument', async () => {
    let forwarded: unknown[] | undefined
    const page = fakePage(async (_fn, payload) => {
      forwarded = payload.args
      return 'ok'
    })

    await ipcRendererInvoke(page, 'create-thing', 'my-thing', [1, 2])

    assert.deepStrictEqual(forwarded, ['my-thing', [1, 2]])
  })

  it('should still pop a trailing retry-options object', async () => {
    let forwarded: unknown[] | undefined
    const page = fakePage(async (_fn, payload) => {
      forwarded = payload.args
      return 'ok'
    })

    await ipcRendererInvoke(page, 'create-thing', 'my-thing', {
      timeout: 50,
      poll: 2,
    })

    assert.deepStrictEqual(forwarded, ['my-thing'])
  })
})

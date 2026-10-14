import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveQueue, type SaveStatus } from './saveQueue'

function deferred() {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('SaveQueue', () => {
  let statuses: SaveStatus[]
  beforeEach(() => {
    vi.useFakeTimers()
    statuses = []
  })
  afterEach(() => vi.useRealTimers())

  it('debounces rapid edits into a single save of the latest value', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const queue = new SaveQueue<string>(save, (s) => statuses.push(s), 1000)

    queue.schedule('a')
    await vi.advanceTimersByTimeAsync(500)
    queue.schedule('ab')
    await vi.advanceTimersByTimeAsync(500)
    queue.schedule('abc')
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('abc')
    expect(statuses.at(-1)).toBe('saved')
    expect(queue.hasUnsavedChanges()).toBe(false)
  })

  it('never runs two saves concurrently and sends edits made during a save afterwards', async () => {
    const first = deferred()
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined)
    const queue = new SaveQueue<string>(save, (s) => statuses.push(s), 1000)

    queue.schedule('v1')
    const flushing = queue.flush() // v1 in flight
    queue.schedule('v2') // edit while saving
    const second = queue.flush() // must wait for v1
    await Promise.resolve()
    expect(save).toHaveBeenCalledTimes(1)

    first.resolve()
    await flushing
    await second
    expect(save.mock.calls.map((c) => c[0])).toEqual(['v1', 'v2'])
    expect(statuses.at(-1)).toBe('saved')
  })

  it('keeps a failed value queued so a retry sends it again', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const onStatus = vi.fn()
    const queue = new SaveQueue<string>(save, onStatus, 1000)

    queue.schedule('draft')
    await queue.flush()
    expect(onStatus).toHaveBeenLastCalledWith('error', expect.any(Error))
    expect(queue.hasUnsavedChanges()).toBe(true)

    await queue.flush() // retry
    expect(save).toHaveBeenLastCalledWith('draft')
    expect(onStatus).toHaveBeenLastCalledWith('saved')
    expect(queue.hasUnsavedChanges()).toBe(false)
  })

  it('does not resurrect an older value when a newer edit arrives during a failed save', async () => {
    const first = deferred()
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined)
    const queue = new SaveQueue<string>(save, () => {}, 1000)

    queue.schedule('old')
    const flushing = queue.flush()
    queue.schedule('new')
    first.reject(new Error('boom'))
    await flushing

    await queue.flush()
    expect(save).toHaveBeenLastCalledWith('new')
  })
})

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

/**
 * Debounced, strictly serial saving: at most one save is in flight, and only the latest
 * value is ever sent. A failed value stays queued so `flush()` can retry it.
 */
export class SaveQueue<T> {
  private pending: { value: T } | null = null
  private inFlight: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly save: (value: T) => Promise<void>
  private readonly onStatus: (status: SaveStatus, error?: unknown) => void
  private readonly delayMs: number

  constructor(
    save: (value: T) => Promise<void>,
    onStatus: (status: SaveStatus, error?: unknown) => void,
    delayMs = 1000,
  ) {
    this.save = save
    this.onStatus = onStatus
    this.delayMs = delayMs
  }

  schedule(value: T): void {
    this.pending = { value }
    this.onStatus('pending')
    this.clearTimer()
    this.timer = setTimeout(() => void this.flush(), this.delayMs)
  }

  /** Saves the latest pending value now (waiting for any in-flight save first). Never rejects. */
  async flush(): Promise<void> {
    this.clearTimer()
    while (this.inFlight) await this.inFlight
    if (!this.pending) return

    const { value } = this.pending
    this.pending = null
    this.onStatus('saving')

    this.inFlight = this.save(value).then(
      () => {
        this.inFlight = null
        this.onStatus(this.pending ? 'pending' : 'saved')
      },
      (error: unknown) => {
        this.inFlight = null
        this.pending ??= { value } // keep the failed value unless something newer arrived
        this.onStatus('error', error)
      },
    )
    await this.inFlight
  }

  hasUnsavedChanges(): boolean {
    return this.pending !== null || this.inFlight !== null
  }

  dispose(): void {
    this.clearTimer()
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}

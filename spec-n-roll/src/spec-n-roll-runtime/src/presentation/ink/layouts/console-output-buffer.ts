/**
 * Batches frequent console writes into short, visually stable transcript updates.
 */
export class ConsoleOutputBuffer {
  /**
   * Milliseconds to wait before publishing a group of console writes.
   */
  static readonly FLUSH_INTERVAL_MS = 33;

  /** Pending output not yet delivered to the transcript owner. */
  private pendingOutput = '';

  /** Scheduled flush that coalesces writes received during one interval. */
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Creates a buffer that delivers coalesced output through one callback.
   *
   * @param onFlush - Receives each non-empty batch of console output.
   */
  constructor(private readonly onFlush: (output: string) => void) {}

  /**
   * Queues console output for the next visual transcript update.
   *
   * @param output - Console text to append. Empty text is ignored.
   */
  write(output: string): void {
    if (output.length === 0) return;
    this.pendingOutput += output;
    if (this.timer != null) return;
    this.timer = setTimeout(
      () => this.flush(),
      ConsoleOutputBuffer.FLUSH_INTERVAL_MS,
    );
  }

  /**
   * Immediately delivers every queued write as one transcript update.
   */
  flush(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.pendingOutput.length === 0) return;
    const output = this.pendingOutput;
    this.pendingOutput = '';
    this.onFlush(output);
  }

  /**
   * Cancels a pending visual update and discards its undelivered output.
   */
  dispose(): void {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = undefined;
    this.pendingOutput = '';
  }
}

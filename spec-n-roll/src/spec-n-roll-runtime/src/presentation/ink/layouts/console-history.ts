/**
 * Retains a bounded line-oriented console transcript.
 */
export class ConsoleHistory {
  /**
   * Maximum number of transcript rows retained for display and scrolling.
   */
  static readonly MAXIMUM_ROWS = 9999;

  /**
   * Appends output and discards the oldest rows beyond the retention limit.
   *
   * @param transcript - Existing console transcript, which may be empty.
   * @param output - New console output to append without interpretation.
   * @returns Transcript containing at most `MAXIMUM_ROWS` rows.
   */
  append(transcript: string, output: string): string {
    return this.retain(`${transcript}${output}`);
  }

  /**
   * Returns the retained rows of a transcript in display order.
   *
   * @param transcript - Console transcript that may exceed the retention limit.
   * @returns At most `MAXIMUM_ROWS` rows, ordered from oldest to newest.
   */
  rows(transcript: string): readonly string[] {
    return this.retain(transcript).split(/\r?\n/);
  }

  /**
   * Discards transcript rows that precede the retention window.
   *
   * @param transcript - Console transcript that may exceed the retention limit.
   * @returns Transcript containing only the newest retained rows.
   */
  private retain(transcript: string): string {
    return transcript
      .split(/\r?\n/)
      .slice(-ConsoleHistory.MAXIMUM_ROWS)
      .join('\n');
  }
}

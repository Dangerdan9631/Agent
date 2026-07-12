/**
 * Describes the centrally allocated rows in the interactive application shell.
 */
export interface TerminalLayout {
  /** Total normalized terminal rows. */
  readonly terminalRows: number;
  /** Fixed status bar rows. */
  readonly statusRows: number;
  /** Flexible route content rows. */
  readonly contentRows: number;
  /** Fixed key hint overlay rows. */
  readonly hintRows: number;
  /** Minimum terminal rows required for the normal shell. */
  readonly minimumRows: number;
  /** Whether resize guidance must replace the normal shell. */
  readonly requiresResize: boolean;
}

/**
 * Allocates fixed shell chrome and gives all remaining rows to route content.
 */
export class TerminalLayoutAllocator {
  /** Fixed status bar height in rows. */
  static readonly STATUS_ROWS = 3;
  /** Fixed key hint overlay height in rows. */
  static readonly HINT_ROWS = 3;
  /** Smallest useful route content height in rows. */
  static readonly MINIMUM_CONTENT_ROWS = 7;

  /**
   * Allocates terminal rows without allowing shell regions to overlap.
   *
   * @param terminalRows - Current stdout height; non-positive values are normalized.
   * @returns Stable shell region allocation and minimum-size state.
   */
  allocate(terminalRows: number): TerminalLayout {
    const rows = Math.max(1, Math.floor(terminalRows));
    const minimumRows =
      TerminalLayoutAllocator.STATUS_ROWS +
      TerminalLayoutAllocator.HINT_ROWS +
      TerminalLayoutAllocator.MINIMUM_CONTENT_ROWS;
    const requiresResize = rows < minimumRows;

    return {
      terminalRows: rows,
      statusRows: TerminalLayoutAllocator.STATUS_ROWS,
      contentRows: requiresResize
        ? 0
        : rows -
          TerminalLayoutAllocator.STATUS_ROWS -
          TerminalLayoutAllocator.HINT_ROWS,
      hintRows: TerminalLayoutAllocator.HINT_ROWS,
      minimumRows,
      requiresResize,
    };
  }
}

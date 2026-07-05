import { useEffect, useState } from 'react';
import { useStdout } from 'ink';

/**
 * Terminal dimensions tracked for fullscreen shell layout.
 */
export interface TerminalSize {
  /**
   * Visible terminal row count. Must be positive when known.
   */
  rows: number;
  /**
   * Visible terminal column count. Must be positive when known.
   */
  columns: number;
}

/**
 * Row count used when neither Ink nor Node reports a usable terminal height.
 */
const FALLBACK_TERMINAL_ROWS = 24;

/**
 * Column count used when neither Ink nor Node reports a usable terminal width.
 */
const FALLBACK_TERMINAL_COLUMNS = 80;

/**
 * Resolves the terminal row count from Ink stdout state with a process fallback.
 *
 * @param stdoutRows - Row count reported by Ink's stdout stream.
 * @returns Positive terminal row count for layout allocation.
 */
function resolveTerminalRows(stdoutRows: number | undefined): number {
  return stdoutRows ?? process.stdout.rows ?? FALLBACK_TERMINAL_ROWS;
}

/**
 * Resolves the terminal column count from Ink stdout state with a process fallback.
 *
 * @param stdoutColumns - Column count reported by Ink's stdout stream.
 * @returns Positive terminal column count for layout allocation.
 */
function resolveTerminalColumns(stdoutColumns: number | undefined): number {
  return stdoutColumns ?? process.stdout.columns ?? FALLBACK_TERMINAL_COLUMNS;
}

/**
 * Reads the current terminal size from the active stdout stream.
 *
 * @param stdout - Ink stdout stream for the running application.
 * @returns Current terminal dimensions with process fallbacks when needed.
 */
function readTerminalSize(stdout: { rows?: number; columns?: number }): TerminalSize {
  return {
    rows: resolveTerminalRows(stdout.rows),
    columns: resolveTerminalColumns(stdout.columns),
  };
}

/**
 * Tracks terminal dimensions and re-renders the caller when the stdout stream resizes.
 *
 * @returns Current terminal row and column counts for layout calculations.
 */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => readTerminalSize(stdout));

  useEffect(() => {
    const syncSize = (): void => {
      setSize(readTerminalSize(stdout));
    };

    stdout.on('resize', syncSize);

    return () => {
      stdout.off('resize', syncSize);
    };
  }, [stdout]);

  return size;
}

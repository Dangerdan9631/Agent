import { useEffect, useState } from 'react';
import { useStdout } from 'ink';

/**
 * Describes the current dimensions of Ink's stdout stream.
 */
export interface StdoutSize {
  /** Current terminal column count with a safe fallback. */
  readonly columns: number;
  /** Current terminal row count with a safe fallback. */
  readonly rows: number;
}

/**
 * Subscribes to stdout resize events so terminal layout recalculates automatically.
 *
 * @returns Current stdout dimensions, updated after every resize event.
 */
export function useStdoutSize(): StdoutSize {
  const { stdout } = useStdout();
  const read = (): StdoutSize => ({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
  const [size, setSize] = useState<StdoutSize>(read);
  useEffect(() => {
    const onResize = (): void => setSize(read());
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);
  return size;
}

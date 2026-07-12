import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ConsoleHistory } from '#runtime/presentation/ink/layouts/console-history.js';

/**
 * Describes a scrollable console transcript within a route-owned layout slot.
 */
export interface ConsoleLayoutProps {
  /**
   * Total rows allocated to the console transcript.
   */
  readonly rows: number;
  /**
   * Complete console transcript, including any trailing line separators.
   */
  readonly output: string;
}

/**
 * Renders a console transcript that follows new output until the user scrolls away.
 *
 * @param props - Route row budget and complete transcript to display.
 * @returns Full-height, page-scrollable console output with a position scrollbar.
 */
export function ConsoleLayout(props: ConsoleLayoutProps): React.ReactElement {
  const history = useMemo(() => new ConsoleHistory(), []);
  const lines = history.rows(props.output);
  const pageSize = Math.max(1, props.rows);
  const [topLine, setTopLine] = useState(Math.max(0, lines.length - pageSize));
  const [following, setFollowing] = useState(true);
  const maximumTopLine = Math.max(0, lines.length - pageSize);
  const visibleTopLine = following
    ? maximumTopLine
    : Math.min(topLine, maximumTopLine);
  const visibleLines = lines.slice(visibleTopLine, visibleTopLine + pageSize);
  const scrollbar = new ConsoleScrollbar(
    pageSize,
    lines.length,
    visibleTopLine,
    maximumTopLine,
  ).render();

  useInput((_input, key) => {
    if (key.pageUp) {
      setFollowing(false);
      setTopLine(Math.max(0, visibleTopLine - pageSize));
    }
    if (key.pageDown) {
      const next = Math.min(maximumTopLine, visibleTopLine + pageSize);
      setFollowing(next === maximumTopLine);
      setTopLine(next);
    }
    if (key.end) {
      setFollowing(true);
      setTopLine(maximumTopLine);
    }
  });

  return (
    <Box height={props.rows} flexDirection="row" overflow="hidden">
      <Box height={props.rows} flexGrow={1} overflow="hidden" paddingX={2}>
        <Text wrap="wrap">{visibleLines.join('\n')}</Text>
      </Box>
      <Box height={props.rows} width={1} flexShrink={0}>
        <Text>{scrollbar}</Text>
      </Box>
    </Box>
  );
}

/**
 * Maps a visible console page to a compact vertical scrollbar.
 */
class ConsoleScrollbar {
  /**
   * Creates one scrollbar for the currently visible transcript page.
   *
   * @param pageRows - Number of rows visible in the console viewport.
   * @param transcriptRows - Number of retained transcript rows.
   * @param topRow - First transcript row displayed in the viewport.
   * @param maximumTopRow - Largest valid first transcript row.
   */
  constructor(
    private readonly pageRows: number,
    private readonly transcriptRows: number,
    private readonly topRow: number,
    private readonly maximumTopRow: number,
  ) {}

  /**
   * Renders one scrollbar character for every console viewport row.
   *
   * @returns Newline-separated scrollbar track and thumb characters.
   */
  render(): string {
    const thumbRows = this.thumbRows();
    const thumbStartRow = this.thumbStartRow(thumbRows);
    return Array.from({ length: this.pageRows }, (_, row) =>
      row >= thumbStartRow && row < thumbStartRow + thumbRows ? '█' : '░',
    ).join('\n');
  }

  /**
   * Calculates the number of rows occupied by the scrollbar thumb.
   *
   * @returns Thumb height clamped to the console viewport.
   */
  private thumbRows(): number {
    if (this.transcriptRows <= this.pageRows) return this.pageRows;
    return Math.max(
      1,
      Math.min(
        this.pageRows,
        Math.ceil((this.pageRows * this.pageRows) / this.transcriptRows),
      ),
    );
  }

  /**
   * Calculates the first viewport row occupied by the scrollbar thumb.
   *
   * @param thumbRows - Height of the scrollbar thumb in viewport rows.
   * @returns First thumb row within the scrollbar viewport.
   */
  private thumbStartRow(thumbRows: number): number {
    if (this.maximumTopRow === 0) return 0;
    return Math.round(
      (this.topRow / this.maximumTopRow) * (this.pageRows - thumbRows),
    );
  }
}

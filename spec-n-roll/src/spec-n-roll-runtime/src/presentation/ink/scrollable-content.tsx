import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Describes vertically scrollable route content constrained to an allocated viewport.
 */
export interface ScrollableContentProps {
  /** Text lines in their complete display order. */
  readonly lines: readonly string[];
  /** Rows available to the viewport; values below one render no content. */
  readonly rows: number;
}

/**
 * Renders a clipped line window and scrolls it with Page Up and Page Down.
 *
 * @param props - Complete content lines and allocated viewport height.
 * @returns Clipped route content with an overflow position indicator.
 */
export function ScrollableContent(props: ScrollableContentProps): React.ReactElement {
  const [offset, setOffset] = useState(0);
  const viewportRows = Math.max(0, Math.floor(props.rows));
  const hasOverflow = props.lines.length > viewportRows;
  const textRows = Math.max(0, viewportRows - (hasOverflow ? 1 : 0));
  const maxOffset = Math.max(0, props.lines.length - textRows);
  const visible = useMemo(
    () => props.lines.slice(offset, offset + textRows),
    [offset, props.lines, textRows],
  );

  useEffect(() => setOffset((value) => Math.min(value, maxOffset)), [maxOffset]);
  useInput((_input, key) => {
    const step = 3;
    if (key.pageDown) setOffset((value) => Math.min(maxOffset, value + step));
    if (key.pageUp) setOffset((value) => Math.max(0, value - step));
  });

  return (
    <Box flexDirection="column" height={viewportRows} overflow="hidden">
      {visible.map((line, index) => <Text key={`${offset + index}-${line}`}>{line}</Text>)}
      {hasOverflow ? <Text color="gray">[{offset + 1}-{Math.min(offset + textRows, props.lines.length)} of {props.lines.length}] PgUp/PgDn</Text> : null}
    </Box>
  );
}

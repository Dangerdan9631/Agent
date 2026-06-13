import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

/**
 * One selectable row displayed by SelectableList.
 */
export interface SelectableListItem {
  /**
   * Stable row key used by React and selection callbacks.
   */
  id: string;
  /**
   * Primary label shown in the list.
   */
  label: string;
  /**
   * Optional secondary text shown after the label.
   */
  description?: string;
  /**
   * Whether the row is disabled and cannot be selected.
   */
  disabled?: boolean;
}

/**
 * Props for a keyboard-driven selectable list.
 */
export interface SelectableListProps<TItem extends SelectableListItem> {
  /**
   * Items to display in their visual order.
   */
  items: readonly TItem[];
  /**
   * Optional accessible label rendered above the list.
   */
  label?: string;
  /**
   * Called when Enter is pressed on an enabled item.
   */
  onSelect: (item: TItem) => void;
  /**
   * Maximum number of rows to render before scrolling. Must be a positive integer when provided.
   */
  maxVisibleItems?: number;
}

/**
 * Finds the next enabled item index when moving through a list.
 *
 * @param items - Candidate list rows in visual order.
 * @param startIndex - Current index before movement.
 * @param direction - Movement direction, where 1 moves down and -1 moves up.
 * @returns Next enabled index, or the current index when no enabled item exists.
 */
function findNextEnabledIndex(
  items: readonly SelectableListItem[],
  startIndex: number,
  direction: 1 | -1,
): number {
  if (items.length === 0) {
    return 0;
  }

  let index = startIndex;
  for (let remaining = 0; remaining < items.length; remaining += 1) {
    index = (index + direction + items.length) % items.length;
    if (items[index]?.disabled !== true) {
      return index;
    }
  }

  return startIndex;
}

/**
 * Calculates the visible row count available to the list viewport.
 *
 * @param itemCount - Total number of rows in the list. Must be zero or greater.
 * @param terminalRows - Terminal height reported by Ink, if available.
 * @param maxVisibleItems - Explicit viewport row count override for constrained callers.
 * @returns Positive number of rows the list should render.
 */
function resolveVisibleItemCount(
  itemCount: number,
  terminalRows: number | undefined,
  maxVisibleItems: number | undefined,
): number {
  if (itemCount === 0) {
    return 0;
  }

  if (maxVisibleItems != null) {
    return Math.max(1, Math.min(itemCount, Math.floor(maxVisibleItems)));
  }

  const fallbackRows = terminalRows ?? process.stdout.rows ?? itemCount;
  return Math.max(1, Math.min(itemCount, fallbackRows - 2));
}

/**
 * Scrolls a list window so the selected row remains visible.
 *
 * @param windowStart - Current first visible row index. Must be zero or greater.
 * @param selectedIndex - Focused row index. Must be zero or greater.
 * @param visibleItemCount - Number of rows visible in the viewport. Must be positive.
 * @returns First visible row index after scroll adjustment.
 */
export function scrollWindowStartIntoView(
  windowStart: number,
  selectedIndex: number,
  visibleItemCount: number,
): number {
  if (selectedIndex < windowStart) {
    return selectedIndex;
  }

  const windowEnd = windowStart + visibleItemCount - 1;
  if (selectedIndex > windowEnd) {
    return selectedIndex - visibleItemCount + 1;
  }

  return windowStart;
}

/**
 * Renders a keyboard-selectable list with a visible focus indicator.
 *
 * @param props - List items and selection callback.
 * @returns React element for a terminal list.
 */
export function SelectableList<TItem extends SelectableListItem>(
  props: SelectableListProps<TItem>,
): React.ReactElement {
  const { stdout } = useStdout();
  const firstEnabledIndex = Math.max(
    0,
    props.items.findIndex((item) => item.disabled !== true),
  );
  const [selectedIndex, setSelectedIndex] = useState(firstEnabledIndex);
  const [windowStart, setWindowStart] = useState(0);
  const visibleItemCount = resolveVisibleItemCount(
    props.items.length,
    stdout.rows,
    props.maxVisibleItems,
  );
  const visibleItems = props.items.slice(windowStart, windowStart + visibleItemCount);

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(0, props.items.length - 1)));
  }, [props.items.length]);

  useEffect(() => {
    setWindowStart((current) => {
      return scrollWindowStartIntoView(current, selectedIndex, visibleItemCount);
    });
  }, [selectedIndex, visibleItemCount]);

  useInput((_input, key) => {
    if (props.items.length === 0) {
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((current) => findNextEnabledIndex(props.items, current, -1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((current) => findNextEnabledIndex(props.items, current, 1));
      return;
    }

    if (key.return) {
      const item = props.items[selectedIndex];
      if (item != null && item.disabled !== true) {
        props.onSelect(item);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {props.label != null ? <Text bold>{props.label}</Text> : null}
      {visibleItems.map((item, offset) => {
        const index = windowStart + offset;
        const focused = index === selectedIndex;
        const indicator = focused ? '>' : ' ';
        const color = item.disabled === true ? 'gray' : focused ? 'cyan' : undefined;

        return (
          <Text key={item.id} color={color}>
            {indicator} {item.label}
            {item.description != null ? ` - ${item.description}` : ''}
          </Text>
        );
      })}
    </Box>
  );
}

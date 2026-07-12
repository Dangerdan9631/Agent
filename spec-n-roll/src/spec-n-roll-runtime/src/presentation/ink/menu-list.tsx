import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

/** Describes one keyboard-selectable menu entry. */
export interface MenuItem {
  /** Stable identifier unique within the list. */ readonly id: string;
  /** Text displayed for the entry. */ readonly label: string;
  /** Whether focus and activation skip this entry. */ readonly disabled?: boolean;
}

/** Describes a selectable menu and its activation boundary. */
export interface MenuListProps {
  /** Ordered menu items, including disabled entries. */ readonly items: readonly MenuItem[];
  /** Called only when an enabled item is activated. */ readonly onSelect: (
    item: MenuItem,
  ) => void;
}

/**
 * Renders an arrow-key menu that skips disabled list items.
 *
 * @param props - Menu rows and enabled-item selection callback.
 * @returns Keyboard-aware menu element.
 */
export function MenuList(props: MenuListProps): React.ReactElement {
  const enabled = useMemo(
    () => props.items.filter((item) => !item.disabled),
    [props.items],
  );
  const [selected, setSelected] = useState(0);
  const selectedItem = enabled[selected];
  useInput((_input, key) => {
    if (enabled.length === 0) return;
    if (key.upArrow)
      setSelected((value) => (value - 1 + enabled.length) % enabled.length);
    if (key.downArrow) setSelected((value) => (value + 1) % enabled.length);
    if (key.return && selectedItem != null) props.onSelect(selectedItem);
  });
  return (
    <Box flexDirection="column" flexShrink={0} height={props.items.length}>
      {props.items.map((item) => (
        <Text
          key={item.id}
          color={
            item.disabled ? 'gray' : item === selectedItem ? 'cyan' : undefined
          }
        >
          {item === selectedItem ? '› ' : '  '}
          {item.label}
          {item.disabled ? ' (disabled)' : ''}
        </Text>
      ))}
    </Box>
  );
}

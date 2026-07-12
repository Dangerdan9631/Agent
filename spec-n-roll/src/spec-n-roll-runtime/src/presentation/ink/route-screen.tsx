import React from 'react';
import { Box, Text } from 'ink';
import type { RouteId } from '#runtime/presentation/ink/navigation-stack.js';
import { MenuList, type MenuItem } from '#runtime/presentation/ink/menu-list.jsx';
import { ScrollableContent } from '#runtime/presentation/ink/scrollable-content.jsx';

/**
 * Describes the route-owned interior of the shell content slot.
 */
export interface RouteScreenProps {
  /** Active route to render. */
  readonly route: RouteId;
  /** Rows allocated by the application shell. */
  readonly rows: number;
  /** Opens a placeholder child route. */
  readonly onNavigate: (route: 'placeholder-one' | 'placeholder-two') => void;
  /** Returns from a placeholder route to its parent. */
  readonly onBack: () => void;
  /** Starts the timed exit confirmation dialog. */
  readonly onExitRequest: () => void;
}

const HOME_MENU: readonly MenuItem[] = [
  { id: 'one', label: 'Placeholder page one' },
  { id: 'disabled-one', label: 'Unavailable placeholder', disabled: true },
  { id: 'two', label: 'Placeholder page two' },
  { id: 'disabled-two', label: 'Another unavailable placeholder', disabled: true },
  { id: 'exit', label: 'Exit' },
];

const PLACEHOLDER_LINES = Array.from(
  { length: 24 },
  (_, index) => `Placeholder scrolling content line ${index + 1}.`,
);

/**
 * Renders home and placeholder routes inside the route content slot.
 *
 * @param props - Active route, row budget, and navigation callbacks.
 * @returns Route-owned content and selection regions.
 */
export function RouteScreen(props: RouteScreenProps): React.ReactElement {
  const home = props.route === 'global-home' || props.route === 'local-home';
  const menuRows = home ? HOME_MENU.length : 1;
  const contentRows = Math.max(1, props.rows - menuRows);
  const title = home ? (props.route === 'global-home' ? 'global' : 'local') : props.route === 'placeholder-one' ? 'placeholder one' : 'placeholder two';

  const onSelect = (item: MenuItem): void => {
    if (item.id === 'exit') props.onExitRequest();
    else if (item.id === 'back') props.onBack();
    else if (item.id === 'one' || item.id === 'two') props.onNavigate(item.id === 'one' ? 'placeholder-one' : 'placeholder-two');
  };

  return (
    <Box flexDirection="column" height={props.rows}>
      <Box flexDirection="column" height={contentRows} paddingX={2}>
        <Text bold>{title}</Text>
        <ScrollableContent rows={Math.max(0, contentRows - 1)} lines={PLACEHOLDER_LINES} />
      </Box>
      <MenuList items={home ? HOME_MENU : [{ id: 'back', label: 'Back' }]} onSelect={onSelect} />
    </Box>
  );
}

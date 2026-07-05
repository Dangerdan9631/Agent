import type { RouteId } from '../../app/navigation.js';
import type { SelectableListItem } from '../SelectableList.js';

/**
 * Selectable Back row with a stable route target.
 */
export interface BackMenuItem extends SelectableListItem {
  /**
   * Numeric shortcut shown in the label prefix.
   */
  key: string;
  /**
   * Route id entered when the Back row is selected.
   */
  routeId: RouteId;
}

/**
 * Options for building a shared Back menu row.
 */
export interface BuildBackMenuItemOptions {
  /**
   * Numeric shortcut shown in the label prefix. Must be a non-empty display string.
   */
  key: string;
  /**
   * Route id entered when the Back row is selected.
   */
  routeId: RouteId;
}

/**
 * Builds the shared Back list row used as the last option on non-home screens.
 *
 * @param options - Numeric shortcut and destination route for the Back row.
 * @returns Selectable Back menu item with stable id and label formatting.
 */
export function buildBackMenuItem(options: BuildBackMenuItemOptions): BackMenuItem {
  return {
    id: 'back',
    key: options.key,
    label: `${options.key} Back`,
    routeId: options.routeId,
  };
}

/**
 * Returns the numeric shortcut for a Back row appended after the given data rows.
 *
 * @param dataItemCount - Number of selectable rows before Back. Must be zero or greater.
 * @returns Display key string for the Back row shortcut.
 */
export function backMenuKeyForIndex(dataItemCount: number): string {
  return String(dataItemCount + 1);
}

/**
 * Appends a Back row as the last selectable item after existing list rows.
 *
 * @param items - Selectable rows shown before Back.
 * @param routeId - Parent route id documented on the Back row.
 * @returns New array with Back appended as the final row.
 */
export function appendBackMenuItem<TItem extends SelectableListItem>(
  items: readonly TItem[],
  routeId: RouteId,
): readonly [...TItem[], BackMenuItem] {
  return [...items, buildBackMenuItem({ key: backMenuKeyForIndex(items.length), routeId })];
}

/**
 * Returns whether a selectable row is the shared Back menu item.
 *
 * @param item - Row to inspect.
 * @returns true when the row id is the stable Back identifier.
 */
export function isBackMenuItem(item: SelectableListItem): item is BackMenuItem {
  return item.id === 'back';
}

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Read-only context attached to the currently focused selectable option.
 */
export interface SelectedOptionContext {
  /**
   * Stable identifier for the focused option. Must be unique within the active selection list.
   */
  id: string;
  /**
   * Short display title for the focused option. Should fit on one terminal row when practical.
   */
  title: string;
  /**
   * Concise description of the focused option. Should be one or two plain English sentences.
   */
  summary: string;
  /**
   * Optional lifecycle, availability, workflow, or configuration state. Should be concise and read-only.
   */
  status?: string;
  /**
   * Optional ordered facts about the focused option. Entries should be independent single-line facts.
   */
  details?: readonly string[];
  /**
   * Optional actionable warnings for missing, invalid, incomplete, or risky state. Entries should not include the "Warning:" prefix.
   */
  warnings?: readonly string[];
  /**
   * Optional description of the action Enter will perform. Should describe activation without causing side effects.
   */
  nextStep?: string;
}

/**
 * Render state for the flexible context content area.
 */
export interface ContextContentState {
  /**
   * Human-readable title for the active route. Must be present even when selected context exists.
   */
  routeTitle: string;
  /**
   * Optional item-specific context for the focused selectable option. When present, it takes priority over fallback summary text.
   */
  selectedContext?: SelectedOptionContext;
  /**
   * Optional route-level summary used when no focused option context exists. Should describe the current section, not a specific row.
   */
  fallbackSummary?: string;
  /**
   * Number of rows allocated to context content. Must be zero or greater and is floored before rendering.
   */
  availableRows?: number;
}

/**
 * Fixed rows reserved for the bordered status bar region in app scaffolding.
 */
export const STATUS_REGION_ROWS = 3;

/**
 * Fixed rows reserved for the key hint overlay region in app scaffolding when hints are visible.
 */
export const KEY_HINT_REGION_ROWS = 1;

/**
 * Top-level terminal frame allocation for app scaffolding.
 */
export interface AppScaffoldingLayout {
  /**
   * Number of terminal rows available to the app. Must be a positive integer when terminal size is known.
   */
  terminalRows: number;
  /**
   * Smallest row count that can show fixed chrome plus minimal route content without overlap.
   */
  minimumRows: number;
  /**
   * Rows reserved for the status bar. Must remain constant across routes and terminal resizes.
   */
  statusRows: number;
  /**
   * Rows reserved for the key hint overlay. Must remain constant across routes and terminal resizes.
   */
  keyHintRows: number;
  /**
   * Flexible rows assigned to the active route content slot. Must absorb height changes not taken by fixed chrome.
   */
  routeContentRows: number;
  /**
   * Whether the terminal is below the minimum row count for normal scaffolding rendering.
   */
  minimumSize: boolean;
}

/**
 * Inputs used to calculate app scaffolding row allocation.
 */
export interface AppScaffoldingLayoutRequest {
  /**
   * Number of terminal rows available to the app. Values below one are treated as one row.
   */
  terminalRows: number;
  /**
   * Rows reserved for the status bar. Values below zero are treated as zero rows.
   */
  statusRows: number;
  /**
   * Rows reserved for the key hint overlay. Values below zero are treated as zero rows.
   */
  keyHintRows: number;
  /**
   * Minimum rows required for route content during normal rendering. Values below zero are treated as zero rows.
   */
  minimumRouteContentRows: number;
}

/**
 * Row allocation for a route content layout with upper content and lower selection sub-regions.
 */
export interface RouteContentLayoutAllocation {
  /**
   * Total rows available to the route content slot from app scaffolding.
   */
  routeContentRows: number;
  /**
   * Smallest row count that can show both selection and minimal content sub-regions without overlap.
   */
  minimumRows: number;
  /**
   * Rows available to the flexible content sub-region after selection sizing.
   */
  contentRows: number;
  /**
   * Rows reserved for the selection list based on visible option count and selection chrome.
   */
  selectionRows: number;
  /**
   * Whether the route slot is too small for normal content and selection sub-region rendering.
   */
  minimumSize: boolean;
}

/**
 * Inputs used to calculate route content layout row allocation.
 */
export interface RouteContentLayoutRequest {
  /**
   * Rows allocated by app scaffolding to the route content slot. Values below zero are treated as zero rows.
   */
  routeContentRows: number;
  /**
   * Rows required by the current selection list. Values below zero are treated as zero rows.
   */
  selectionRows: number;
  /**
   * Minimum rows required for the content sub-region during normal rendering. Values below zero are treated as zero rows.
   */
  minimumContentRows: number;
}

/**
 * Fullscreen row allocation for the interactive shell regions.
 */
export interface FullscreenLayout {
  /**
   * Number of terminal rows available to the app. Must be a positive integer when terminal size is known.
   */
  terminalRows: number;
  /**
   * Smallest row count that can show status, context, and selection regions without overlap.
   */
  minimumRows: number;
  /**
   * Rows reserved for persistent status. Must remain stable while normal navigation redraws.
   */
  statusRows: number;
  /**
   * Rows available to the flexible context content area. Must never be negative.
   */
  contentRows: number;
  /**
   * Rows reserved for the active selection or prompt. Must remain visible during normal navigation.
   */
  selectionRows: number;
  /**
   * Whether the terminal is below the minimum row count for normal region rendering.
   */
  minimumSize: boolean;
}

/**
 * Inputs used to calculate fullscreen row allocation.
 */
export interface FullscreenLayoutRequest {
  /**
   * Number of terminal rows available to the app. Values below one are treated as one row.
   */
  terminalRows: number;
  /**
   * Rows reserved for persistent status. Values below zero are treated as zero rows.
   */
  statusRows: number;
  /**
   * Rows reserved for the active selection or prompt. Values below zero are treated as zero rows.
   */
  selectionRows: number;
  /**
   * Minimum rows required for context content during normal rendering. Values below zero are treated as zero rows.
   */
  minimumContextRows: number;
}

/**
 * Props for the reusable context content renderer.
 */
export interface ContextContentProps {
  /**
   * Context state to render. The state must be read-only and free of mutation callbacks.
   */
  state: ContextContentState;
}

/**
 * Visible window of context lines after applying scroll offset and viewport height.
 */
export interface ContextContentViewport {
  /**
   * Lines visible in the current viewport after scrolling.
   */
  visibleLines: readonly string[];
  /**
   * Normalized scroll offset applied to the full line list.
   */
  scrollOffset: number;
  /**
   * Whether the full line list exceeds the viewport height.
   */
  hasOverflow: boolean;
}

/**
 * Converts a row count into a non-negative integer.
 *
 * @param rows - Candidate row count. Fractional and negative values are normalized.
 * @returns Non-negative integer row count.
 */
function normalizeRows(rows: number): number {
  return Math.max(0, Math.floor(rows));
}

/**
 * Converts a terminal row count into a positive integer.
 *
 * @param rows - Candidate terminal row count. Fractional and sub-one values are normalized.
 * @returns Positive integer terminal row count.
 */
function normalizeTerminalRows(rows: number): number {
  return Math.max(1, Math.floor(rows));
}

/**
 * Builds prioritized display lines for selected option context.
 *
 * @param selectedContext - Focused option context with required title and summary.
 * @returns Context lines ordered from highest to lowest display priority.
 */
function buildSelectedContextLines(selectedContext: SelectedOptionContext): string[] {
  const warnings = selectedContext.warnings?.map((warning) => `Warning: ${warning}`) ?? [];
  const status = selectedContext.status == null ? [] : [`Status: ${selectedContext.status}`];
  const nextStep = selectedContext.nextStep == null ? [] : [`Next: ${selectedContext.nextStep}`];

  return [
    selectedContext.title,
    ...warnings,
    ...status,
    selectedContext.summary,
    ...nextStep,
    ...(selectedContext.details ?? []),
  ];
}

/**
 * Allocates terminal rows for fixed status and key hint chrome with a flexible route content slot.
 *
 * @param request - Row requirements for app scaffolding. All values are normalized before allocation.
 * @returns App scaffolding layout with non-negative route content rows and minimum-size state.
 */
export function allocateAppScaffoldingLayout(
  request: AppScaffoldingLayoutRequest,
): AppScaffoldingLayout {
  const terminalRows = normalizeTerminalRows(request.terminalRows);
  const statusRows = normalizeRows(request.statusRows);
  const keyHintRows = normalizeRows(request.keyHintRows);
  const minimumRouteContentRows = normalizeRows(request.minimumRouteContentRows);
  const minimumRows = statusRows + keyHintRows + minimumRouteContentRows;
  const routeContentRows = Math.max(0, terminalRows - statusRows - keyHintRows);

  return {
    terminalRows,
    minimumRows,
    statusRows,
    keyHintRows,
    routeContentRows: terminalRows < minimumRows ? 0 : routeContentRows,
    minimumSize: terminalRows < minimumRows,
  };
}

/**
 * Allocates route slot rows between a flexible content sub-region and a selection list sub-region.
 *
 * @param request - Row requirements for route content layout. All values are normalized before allocation.
 * @returns Route content layout allocation with non-negative content rows and minimum-size state.
 */
export function allocateRouteContentLayout(
  request: RouteContentLayoutRequest,
): RouteContentLayoutAllocation {
  const routeContentRows = normalizeRows(request.routeContentRows);
  const selectionRows = normalizeRows(request.selectionRows);
  const minimumContentRows = normalizeRows(request.minimumContentRows);
  const minimumRows = selectionRows + minimumContentRows;
  const contentRows = Math.max(0, routeContentRows - selectionRows);

  return {
    routeContentRows,
    minimumRows,
    contentRows: routeContentRows < minimumRows ? 0 : contentRows,
    selectionRows,
    minimumSize: routeContentRows < minimumRows,
  };
}

/**
 * Allocates terminal rows between status, context, and selection regions.
 *
 * @param request - Row requirements for the fullscreen shell. All values are normalized before allocation.
 * @returns Fullscreen layout with non-negative content rows and minimum-size state.
 */
export function allocateFullscreenLayout(request: FullscreenLayoutRequest): FullscreenLayout {
  const terminalRows = normalizeTerminalRows(request.terminalRows);
  const statusRows = normalizeRows(request.statusRows);
  const selectionRows = normalizeRows(request.selectionRows);
  const minimumContextRows = normalizeRows(request.minimumContextRows);
  const minimumRows = statusRows + selectionRows + minimumContextRows;
  const contentRows = Math.max(0, terminalRows - statusRows - selectionRows);

  return {
    terminalRows,
    minimumRows,
    statusRows,
    contentRows: terminalRows < minimumRows ? 0 : contentRows,
    selectionRows,
    minimumSize: terminalRows < minimumRows,
  };
}

/**
 * Checks whether a layout allocation is too small for normal region rendering.
 *
 * @param layout - Calculated fullscreen or scaffolding row allocation.
 * @returns true when the shell should render the minimum-size message, false otherwise.
 */
export function isMinimumLayout(layout: { minimumSize: boolean }): boolean {
  return layout.minimumSize;
}

/**
 * Builds the full prioritized context line list for the current state.
 *
 * @param state - Context state used to derive route and focused option lines.
 * @returns Ordered context lines without viewport clipping.
 */
export function buildContextContentLines(state: ContextContentState): string[] {
  return state.selectedContext == null
    ? [state.routeTitle, state.fallbackSummary].filter((line): line is string => line != null)
    : buildSelectedContextLines(state.selectedContext);
}

/**
 * Builds the visible context lines for a constrained row allocation.
 *
 * @param state - Context state and available row count. Missing row count renders all available priority lines.
 * @returns Ordered context lines clipped to the available row budget.
 */
export function renderContextContentLines(state: ContextContentState): string[] {
  const lines = buildContextContentLines(state);

  if (state.availableRows == null) {
    return lines;
  }

  return lines.slice(0, normalizeRows(state.availableRows));
}

/**
 * Applies a scroll offset to a context line list within a viewport height.
 *
 * @param lines - Full ordered context lines. Must not be mutated by this function.
 * @param viewportRows - Number of visible rows in the viewport. Must be zero or greater.
 * @param scrollOffset - Requested scroll offset measured in lines from the top.
 * @returns Visible lines, normalized offset, and overflow state for the viewport.
 */
export function scrollContextLines(
  lines: readonly string[],
  viewportRows: number,
  scrollOffset: number,
): ContextContentViewport {
  const viewport = normalizeRows(viewportRows);

  if (viewport === 0 || lines.length === 0) {
    return { visibleLines: [], scrollOffset: 0, hasOverflow: false };
  }

  const hasOverflow = lines.length > viewport;
  const maxOffset = Math.max(0, lines.length - viewport);
  const offset = Math.min(Math.max(0, Math.floor(scrollOffset)), maxOffset);

  return {
    visibleLines: lines.slice(offset, offset + viewport),
    scrollOffset: offset,
    hasOverflow,
  };
}

/**
 * Builds a one-column scrollbar track for vertically overflowing context content.
 *
 * @param viewportRows - Number of visible rows in the viewport. Must be zero or greater.
 * @param totalLines - Total number of context lines available to scroll. Must be zero or greater.
 * @param scrollOffset - Current scroll offset measured in lines from the top.
 * @returns Scrollbar characters with one entry per viewport row, or an empty array when no overflow exists.
 */
export function buildScrollbarTrack(
  viewportRows: number,
  totalLines: number,
  scrollOffset: number,
): readonly string[] {
  const viewport = normalizeRows(viewportRows);

  if (viewport === 0 || totalLines <= viewport) {
    return [];
  }

  const maxOffset = totalLines - viewport;
  const thumbSize = Math.max(1, Math.round((viewport * viewport) / totalLines));
  const maxThumbTop = Math.max(0, viewport - thumbSize);
  const thumbTop = maxOffset === 0 ? 0 : Math.round((scrollOffset / maxOffset) * maxThumbTop);
  const track: string[] = [];

  for (let row = 0; row < viewport; row += 1) {
    track.push(row >= thumbTop && row < thumbTop + thumbSize ? '█' : '│');
  }

  return track;
}

/**
 * Renders read-only context for the current route or focused selection.
 *
 * @param props - Context state used to render prioritized text rows.
 * @returns React element for the flexible middle shell region.
 */
export function ContextContent(props: ContextContentProps): React.ReactElement {
  const allLines = useMemo(() => buildContextContentLines(props.state), [props.state]);
  const viewportRows = normalizeRows(props.state.availableRows ?? allLines.length);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { visibleLines, hasOverflow } = scrollContextLines(allLines, viewportRows, scrollOffset);
  const scrollbar = buildScrollbarTrack(viewportRows, allLines.length, scrollOffset);
  const contextKey = useMemo(
    () =>
      [
        props.state.routeTitle,
        props.state.fallbackSummary ?? '',
        props.state.selectedContext?.id ?? '',
      ].join('\u0000'),
    [props.state.fallbackSummary, props.state.routeTitle, props.state.selectedContext?.id],
  );

  useEffect(() => {
    setScrollOffset(0);
  }, [contextKey]);

  useEffect(() => {
    const maxOffset = Math.max(0, allLines.length - viewportRows);
    setScrollOffset((current) => Math.min(current, maxOffset));
  }, [allLines.length, viewportRows]);

  useInput((_input, key) => {
    if (!hasOverflow) {
      return;
    }

    const maxOffset = Math.max(0, allLines.length - viewportRows);

    if (key.pageDown) {
      setScrollOffset((current) => Math.min(current + 1, maxOffset));
      return;
    }

    if (key.pageUp) {
      setScrollOffset((current) => Math.max(0, current - 1));
    }
  });

  return (
    <Box
      paddingX={1}
      flexDirection="row"
      flexGrow={1}
      flexShrink={1}
      height={viewportRows > 0 ? viewportRows : undefined}
      width="100%"
    >
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, index) => {
          const isWarning = line.startsWith('Warning:');
          const isTitle = scrollOffset + index === 0;

          return (
            <Text
              key={`${scrollOffset + index}:${line}`}
              color={isWarning ? 'yellow' : undefined}
              bold={isTitle}
            >
              {line}
            </Text>
          );
        })}
      </Box>
      {hasOverflow ? (
        <Box flexDirection="column" marginLeft={1}>
          {scrollbar.map((character, index) => (
            <Text key={`scroll:${index}`} color="gray">
              {character}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

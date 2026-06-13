# UI Contract: App Scaffolding and Route Content Layout

## Purpose

This contract defines the visible layout behavior for the interactive terminal app after restructuring the shell into fixed chrome regions and route-owned content. It supersedes the region model in `specs/003-ink-content-area/contracts/ui-layout.md` for scaffolding and selection sizing while preserving read-only focus context rules.

## App Scaffolding Region Order

Every normal interactive screen uses this vertical order:

```text
Status Bar              (fixed height)
Route Content Area      (flexible height)
Key Hint Overlay        (fixed height, centered content)
```

The status bar and key hint overlay heights MUST NOT change when terminal height changes or when navigating between routes. The route content area MUST absorb all remaining vertical space.

## Scaffolding Sizing Rules

- The shell occupies the available terminal height during normal operation.
- `statusRows` and `keyHintRows` are product constants applied on every route.
- `routeContentRows = terminalRows - statusRows - keyHintRows`.
- When rows are removed from the terminal, `routeContentRows` shrinks; fixed chrome does not.
- When the terminal is below the minimum usable size, the shell renders a clear minimum-size message instead of overlapping regions.

## Key Hint Overlay Rules

- The overlay always reserves `keyHintRows`, even when hints are toggled hidden.
- Hint text is horizontally centered as a group within the overlay.
- Global shortcuts (`q`, `b`, `?`, arrow navigation, Enter) are always available as defaults.
- Routes may supply supplemental hints; the overlay merges defaults with route hints without changing overlay height.
- Hint text must not overlap the route content area.

## Route Content Area Rules

- The active route owns the entire route content area interior.
- Navigating between routes replaces the full interior of the route content area.
- Routes without selectable options may use the full `routeContentRows` slot directly (forms, confirmations, read-only detail panes).
- Routes with selectable options MUST use the Route Content Layout defined below.

## Route Content Layout (inside route content area)

Routes that present both informational content and a selection list use this interior order:

```text
Content Area        (flexible within route slot)
Selection List      (height = visible option rows + selection chrome)
```

### Route content layout sizing rules

- The selection list sizes vertically to fit the number of selection options currently shown (one row per visible option unless the route documents additional selection chrome rows).
- `contentRows = routeContentRows - selectionRows`.
- Extra rows within the route slot go to the content area, not the selection list.
- When option count increases, selection rows grow and content rows shrink in the same redraw.
- When option count decreases, selection rows shrink and content rows grow in the same redraw.
- Selection overflow uses in-list scrolling or truncation without overlapping app scaffolding.
- Content overflow uses clipping, summarization, or in-area scrolling without pushing the selection list or scaffolding regions off screen.

## Focus and Content Rules

Inherited from feature 003:

- Each selectable row may provide a `SelectedOptionContext`.
- Moving focus updates the route content area within one visible redraw.
- Focus updates are read-only and must not invoke route changes, command orchestration, or file writes.
- Pressing Enter or another explicit activation key remains the only way to run the selected action.
- If a row lacks item-specific context, the content area shows section-level fallback context.

## Content Priority (within route content area)

When content rows are limited, render in this priority order:

1. Context title
2. Blocking or actionable warnings
3. Status details
4. Summary
5. Next-step hint
6. Additional details

## Screen Coverage

### Must use Route Content Layout

- Main menu
- Task specs list
- Workflows list
- Agents list
- Project metadata view (when list-driven)
- Setup menu

### May use full route content slot

- Task spec detail and mutation flows
- Workflow detail
- Agent add/remove flows
- Project metadata edit
- Setup init/version/update and other form or confirmation screens

All screens still render inside the app scaffolding; only the interior pattern differs.

## Testable Outcomes

- In supported terminal sizes, output shows status text, then route content, then centered key hints with no overlap.
- Resizing the terminal changes only the route content area height; status and key hint regions keep stable heights.
- On routes using Route Content Layout, changing option count changes selection height and content height inversely within one redraw.
- Key hint text is horizontally centered at narrow and wide terminal widths.
- Comparing main menu and specs list at the same terminal size shows distinct selection options and distinct content material.
- Focus-only navigation does not change route text or project files.
- Below minimum usable height, normal controls are replaced by a minimum-size message.

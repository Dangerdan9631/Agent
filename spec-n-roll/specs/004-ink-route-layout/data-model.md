# Data Model: Ink Route Layout and App Scaffolding

## App Scaffolding Layout

Represents the top-level terminal frame shared by every route.

**Fields**:

- `terminalRows`: Number of rows available to the app. Must be a positive integer when known.
- `minimumRows`: Smallest row count that can show fixed chrome plus minimal route content without overlap.
- `statusRows`: Fixed rows reserved for the status bar. Must remain constant across routes and resizes.
- `keyHintRows`: Fixed rows reserved for the key hint overlay. Must remain constant across routes and resizes.
- `routeContentRows`: Flexible rows assigned to the active route interior. Must absorb all height changes not taken by fixed chrome.
- `minimumSize`: Whether the terminal is too small for normal rendering.

**Validation Rules**:

- `routeContentRows` must never be negative.
- Region order is always status bar, route content area, key hint overlay.
- `statusRows` and `keyHintRows` do not change when `terminalRows` changes.
- If `terminalRows < minimumRows`, render the minimum-size message instead of normal regions.

## Route Content Slot

Represents the middle region whose interior is owned by the active route.

**Fields**:

- `routeId`: Stable identifier for the active route.
- `availableRows`: Rows allocated by app scaffolding to this slot.
- `presentation`: Either a full-slot route view or a `RouteContentLayout` instance.
- `routeHints`: Optional route-specific keyboard guidance merged into the overlay defaults.

**Validation Rules**:

- Only the active route may render into the slot.
- Route transitions replace the entire slot interior in one redraw.
- `availableRows` must match scaffolding allocation for the current terminal size.

## Route Content Layout

Represents the reusable pattern for routes that combine informational content with a bottom selection list.

**Fields**:

- `contentRows`: Rows available to the upper content sub-region after selection sizing.
- `selectionRows`: Rows required by the current selection list based on visible option count.
- `content`: Read-only informational material for the upper region (context text, summaries, warnings).
- `selectionItems`: Ordered selectable options presented in the lower region.
- `focusedItemId`: Stable id of the currently focused option.
- `overflowState`: Whether content fits, is reduced, clipped, or scrollable within `contentRows`.

**Validation Rules**:

- `selectionRows` must equal the visible option row budget for the current list (one row per visible option, plus any route-level selection chrome such as banners).
- `contentRows = availableRows - selectionRows` and must never be negative; when selection exceeds available rows, selection overflow uses scrolling/truncation without overlapping app chrome.
- Zero selection options means the route should not use this layout pattern and instead consumes the full route slot.
- Focus changes update `content` without route navigation or file mutation.

## Key Hint Overlay

Represents fixed bottom keyboard guidance.

**Fields**:

- `globalHints`: Default shortcuts available on every route (`q`, `b`, `?`, arrows, Enter).
- `routeHints`: Optional supplemental hints from the active route.
- `visible`: Whether hint text is shown; fixed rows remain reserved regardless.
- `alignment`: Horizontal presentation rule; must be centered as a group.

**Validation Rules**:

- Overlay height is independent of hint text length and visibility toggle.
- Hint content must not overlap the route content slot.
- When `visible` is false, overlay rows remain reserved with empty or minimal centered presentation.

## Selection List (route-owned)

Represents choosable options inside a route content layout.

**Fields**:

- `items`: Ordered selectable options.
- `focusedItemId`: Currently focused option id.
- `visibleWindow`: Visible row range when options exceed available selection rows.
- `rowContribution`: Reported terminal rows required by the list and any selection chrome.

**Validation Rules**:

- `rowContribution` drives `selectionRows` in `RouteContentLayout`.
- Focus movement may update route content; activation remains explicit.
- List height changes trigger content sub-region resize in the same redraw.

## Selected Option Context

Reused from feature 003 without semantic change.

**Fields**:

- `id`, `title`, `summary`, `status`, `details`, `warnings`, `nextStep`

**Validation Rules**:

- Required fields and read-only focus behavior remain unchanged from `specs/003-ink-content-area/data-model.md`.

## State Transitions

```text
App launches -> scaffolding allocates fixed chrome + route slot
Route enters -> route renders full slot or RouteContentLayout
Selection options load -> selectionRows recalculated, contentRows adjusted
Focus changes -> route content updates, route stack and files unchanged
Selection activates -> existing navigation/mutation flow runs
Terminal resizes -> scaffolding recalculates routeContentRows; route layout preserves focus
Hints toggled -> overlay text hidden/shown within fixed keyHintRows
Route changes -> new route owns slot; prior route interior unmounts
Terminal below minimum -> minimum-size message; session state preserved
```

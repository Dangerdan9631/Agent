# Feature Specification: Ink Route Layout and App Scaffolding

**Feature Branch**: `004-ink-route-layout`

**Created**: 2026-06-13

**Status**: Complete

**Input**: User description: "The INK UI should have an app scaffolding with the statusbar at the top, and the key hint overlay at the bottom. Those should be fixed sizes. In between should be a content area that dynamically sizes. The entire content area should be set per route. Also, make the key hint overlay content centered. Create a layout that has a content area and a selection list at the bottom. The selection list should be sized to fit the number of selection options, and the content area should fill the remaining area. Each route should use the content layout and populate its selection and content areas specific to that route."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent App Shell Across Routes (Priority: P1)

A developer navigates between screens in the interactive terminal application and always sees the same predictable frame: a status bar at the top, a route-specific middle region, and keyboard guidance at the bottom.

**Why this priority**: A stable app shell is the foundation for every route. Without fixed chrome and a dedicated route content slot, each screen would fight for space and the experience would feel inconsistent.

**Independent Test**: Can be fully tested by visiting multiple primary routes and verifying that the status bar and key hint overlay remain present with stable heights while only the middle region changes per route.

**Acceptance Scenarios**:

1. **Given** the interactive application is open on any route, **When** the screen renders, **Then** the status bar appears at the top, the route content area appears in the middle, and the key hint overlay appears at the bottom in that order.
2. **Given** the terminal height changes, **When** the application redraws, **Then** the status bar and key hint overlay keep their fixed heights while the route content area grows or shrinks to absorb the change.
3. **Given** the developer navigates from one route to another, **When** the new route loads, **Then** the status bar and key hint overlay remain in place and the entire middle region is replaced by that route's content.

---

### User Story 2 - Route Content with Selection and Detail Areas (Priority: P1)

A developer uses a route that presents a list of choices at the bottom and contextual information above, with the list taking only the space it needs and the detail area using all remaining room.

**Why this priority**: Most navigation routes combine selectable options with explanatory content. Correct space allocation keeps options readable without wasting terminal height or crowding the detail view.

**Independent Test**: Can be fully tested by opening a route that uses the content layout, changing the number of visible selection options, and verifying that the selection list height tracks the option count while the upper content area fills the leftover space.

**Acceptance Scenarios**:

1. **Given** a route that uses the content layout with three selection options, **When** the screen renders, **Then** the selection list occupies space for three options and the content area fills all remaining space within the route content slot.
2. **Given** the same route with selection options added or removed, **When** the screen redraws, **Then** the selection list resizes to fit the current option count and the content area adjusts to fill the remaining space.
3. **Given** the developer moves focus among selection options, **When** the focused option changes, **Then** the route's content area updates to show information specific to that route and selection state without changing the app shell heights.

---

### User Story 3 - Centered Keyboard Guidance (Priority: P2)

A developer reads available keyboard actions from a bottom overlay that is easy to scan because its hints are centered within a fixed-height region.

**Why this priority**: Centered key hints improve readability in wide terminals and reinforce that guidance is global rather than tied to a single side of the screen.

**Independent Test**: Can be fully tested by opening any route with key hints and verifying that hint text is horizontally centered within the key hint overlay regardless of terminal width.

**Acceptance Scenarios**:

1. **Given** a route that defines key hints, **When** the screen renders, **Then** the hint text appears centered within the key hint overlay.
2. **Given** a narrow terminal width, **When** hint text is longer than one line allows, **Then** the key hint overlay preserves its fixed height and presents hints readably without overlapping the route content area.
3. **Given** the developer navigates between routes with different hints, **When** each route renders, **Then** the key hint overlay updates to that route's hints while remaining centered and fixed in height.

---

### User Story 4 - Each Route Owns Its Layout Content (Priority: P1)

A developer experiences route-specific screens where each route supplies its own selection options and content presentation within the shared layouts, rather than sharing one generic middle panel.

**Why this priority**: Per-route content assignment is the mechanism that makes the layout system useful. Routes must be able to define what appears in their selection list and content area independently.

**Independent Test**: Can be fully tested by comparing two routes that use the content layout and verifying that each shows different selection options and different content for the same terminal size.

**Acceptance Scenarios**:

1. **Given** two different routes that both use the content layout, **When** each route is displayed, **Then** each shows its own selection options and its own content area material.
2. **Given** a route that does not require a selection list, **When** that route is displayed, **Then** it may use the full route content slot for content without presenting an empty selection region.
3. **Given** a route transitions while the user has an item focused, **When** the user returns to that route, **Then** the route restores its own selection and content presentation within the shared layout rules.

### Edge Cases

- What happens when a route has zero selection options? The route uses the full route content slot for content and does not reserve space for an empty selection list.
- What happens when a route has more selection options than fit in the available route content slot? The selection list uses available space up to the route content limit, and overflow is handled with scrolling or truncation without overlapping the status bar or key hint overlay.
- What happens when route content is taller than the available content area within the layout? Content is clipped, summarized, or scrollable within the content area without pushing the selection list or app shell regions off screen.
- What happens when the terminal is too small for the fixed app shell plus minimal route content? The application shows a clear minimum-size message rather than overlapping regions.
- What happens when terminal dimensions change during navigation? Layout recalculates without losing the current route, selection focus, or navigation state.
- What happens when a route provides no key hints? The key hint overlay still renders at its fixed height with an empty or minimal centered presentation, or a route-appropriate default hint set.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The interactive application MUST provide an app scaffolding layout with three vertical regions ordered from top to bottom: status bar, route content area, and key hint overlay.
- **FR-002**: The status bar MUST use a fixed height that does not change when terminal height changes or when navigating between routes.
- **FR-003**: The key hint overlay MUST use a fixed height that does not change when terminal height changes or when navigating between routes.
- **FR-004**: The route content area MUST be the flexible region between the status bar and key hint overlay that expands and contracts to fill remaining terminal height.
- **FR-005**: Each route MUST define the entire presentation placed within the route content area for that screen.
- **FR-006**: The key hint overlay MUST display route-relevant keyboard guidance with content horizontally centered within the overlay region.
- **FR-007**: The application MUST provide a reusable content layout composed of an upper content area and a lower selection list, intended for use inside the route content area.
- **FR-008**: Within the content layout, the selection list MUST size vertically to fit the number of selection options currently presented by the route.
- **FR-009**: Within the content layout, the content area MUST fill all remaining vertical space in the route content slot after the selection list height is allocated.
- **FR-010**: Routes that present selectable options MUST use the content layout and MUST supply both their selection options and their content area material.
- **FR-011**: When the number of selection options changes on a route, the selection list MUST resize accordingly and the content area MUST adjust to use the remaining space in the same redraw cycle.
- **FR-012**: When route content exceeds the available content area height, the application MUST keep the selection list and app shell regions visible and MUST present overflow through clipping, summarization, or in-area scrolling.
- **FR-013**: Navigation between routes MUST preserve the app scaffolding region order and fixed-height behavior while swapping only the route content area presentation.
- **FR-014**: When the terminal is below the minimum usable size for the scaffolding and route content, the application MUST show a clear message explaining that more space is needed instead of rendering overlapping controls.
- **FR-015**: Existing navigation, selection, and mutation flows from the interactive application MUST remain reachable after the layout scaffolding and route content layout are introduced.

### Key Entities

- **App Scaffolding**: The top-level terminal layout frame containing the status bar, route content area, and key hint overlay for every route.
- **Status Bar**: The fixed-height top region showing persistent session information such as project context, active route, or operation status.
- **Route Content Area**: The dynamic middle region whose entire interior is owned and populated by the active route.
- **Key Hint Overlay**: The fixed-height bottom region showing centered keyboard guidance for the active route or global actions.
- **Content Layout**: A route-level layout pattern with an upper content area and a lower selection list used inside the route content area.
- **Selection List**: The route-owned list of choosable options whose height matches the number of options shown.
- **Route**: A navigable screen that defines its route content area interior, including whether it uses the content layout and what it places in each sub-region.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In terminals at or above the supported minimum height, 100% of tested routes display the status bar, route content area, and key hint overlay in the required order with no overlapping text.
- **SC-002**: Across small, medium, and tall terminal heights, the status bar and key hint overlay maintain fixed heights in 100% of resize scenarios while the route content area absorbs all height changes.
- **SC-003**: On routes using the content layout, the selection list height matches the visible option count within one redraw in 100% of tested option-count changes.
- **SC-004**: On routes using the content layout, at least 90% of remaining vertical space within the route content slot is allocated to the content area after the selection list is sized.
- **SC-005**: Key hint text is horizontally centered within the key hint overlay in 100% of tested terminal widths.
- **SC-006**: When comparing at least two routes that use the content layout, each route presents distinct selection options and distinct content area material in 100% of tested cases.
- **SC-007**: Navigation state and focused selection remain unchanged after terminal resize in 100% of tested scenarios.
- **SC-008**: 90% of first-time users can identify available keyboard actions from the key hint overlay without opening help documentation during usability testing.

## Assumptions

- This feature refines and structures the layout model introduced in `specs/003-ink-content-area` and applies within the interactive Ink application from `specs/002-ink-interactive-cli`.
- Fixed heights for the status bar and key hint overlay are consistent values across routes and terminal sizes, defined by the product rather than computed from content length.
- The key hint overlay shows keyboard shortcuts and navigation affordances relevant to the active route, with sensible global defaults when a route does not override hints.
- Routes that need both explanatory content and a list of choices are the primary consumers of the content layout; routes that need only forms, confirmations, or full-screen lists may use the full route content slot without the selection sub-region.
- Selection list sizing means one row (or equivalent visual unit) per visible option, not a fixed maximum row count unrelated to option count.
- Centering applies to the key hint overlay content as a whole; individual hint items may wrap but remain centered as a group.
- Non-interactive CLI behavior is out of scope for this feature.

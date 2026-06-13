# Research: Ink Context Content Area

## Decision: Shell owns the fixed fullscreen frame

**Rationale**: The existing `AppShell` already composes the status bar, routed screen, and global key hints. Making it the owner of region order gives one place to enforce status bar > content area > selection area, minimum terminal height, and flexible middle sizing.

**Alternatives considered**:

- Put content areas inside every screen: rejected because each screen would need to duplicate ordering and minimum-size behavior.
- Wrap only list screens: rejected because detail and action screens also need consistent context and terminal sizing.

## Decision: Selection focus is separate from selection activation

**Rationale**: The feature requires context to update as the focused option changes, while current `SelectableList` only exposes `onSelect` for Enter. A distinct focus-change signal keeps read-only context updates separate from actions and protects the no-mutation requirement for focus-only navigation.

**Alternatives considered**:

- Derive focus by parsing rendered text: rejected because it is brittle and couples business state to presentation output.
- Treat Enter selection as the only context update moment: rejected because it does not satisfy the requirement to change information as the user selection changes.

## Decision: Use a compact shared context model

**Rationale**: Top-level routes, list rows, warnings, and setup actions need the same basic shape: title, summary, status details, warnings, and optional next-step hints. A shared model keeps screen-specific code focused on assembling facts rather than reimplementing display rules.

**Alternatives considered**:

- Free-form React children for all context content: rejected because it makes success criteria harder to test uniformly across screens.
- One global context generator for every route: rejected because screens already own their read-model data and can describe selected rows more accurately.

## Decision: Content overflow favors concise reduction before scrolling

**Rationale**: Terminal users need stable selection controls more than exhaustive context. The content area should prioritize title, status, warning, and top details, then clip or summarize lower-priority details without pushing the selection area away.

**Alternatives considered**:

- Always scroll the content area independently: rejected for initial scope because it adds competing focus modes and more keyboard state.
- Allow selection controls to move down as context grows: rejected because it violates the required stable region order.

## Decision: Minimum-size behavior is explicit

**Rationale**: When a terminal cannot show the status bar, at least one content line, and usable selection controls, overlapping text is worse than a direct message. The shell can render a minimum-size message while preserving app state for the next redraw.

**Alternatives considered**:

- Let Ink naturally wrap and crop: rejected because it can hide controls and make the app appear broken.
- Exit automatically on small terminals: rejected because users can resize and continue without losing session state.

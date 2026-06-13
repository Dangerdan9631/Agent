# Data Model: Ink Context Content Area

## Fullscreen Layout

Represents the visible terminal frame for the interactive app.

**Fields**:

- `terminalRows`: Number of rows available to the app. Must be a positive integer when known.
- `minimumRows`: Smallest row count that can show required regions without overlap. Must account for status, at least one context line, selection controls, and key hints when visible.
- `statusRows`: Rows reserved for persistent status. Must remain stable during normal navigation.
- `selectionRows`: Rows reserved for the active selection or prompt. Must remain visible during normal navigation.
- `contentRows`: Rows available to the context content area. Must absorb extra rows and shrink before status or selection rows.

**Validation Rules**:

- `contentRows` must never be negative.
- If `terminalRows < minimumRows`, the shell renders the minimum-size message instead of normal regions.
- The region order is always status, content, selection.

## Context Content Area

Represents the flexible middle region that displays read-only context.

**Fields**:

- `routeTitle`: Human-readable name for the active route. Must be present.
- `selectedContext`: Selected option context for the focused item, when available.
- `fallbackSummary`: Section-level summary used when no item-specific context exists.
- `availableRows`: Number of rows currently allocated to context content.
- `overflowState`: Whether all context fits, has been reduced, or has been clipped.

**Validation Rules**:

- The area must render useful text when either `selectedContext` or `fallbackSummary` exists.
- The area must not invoke mutations while rendering or responding to focus changes.
- Warning text takes priority over optional hints when space is limited.

## Selected Option Context

Represents the information attached to the currently focused menu row or action.

**Fields**:

- `id`: Stable identifier for the focused option. Must be unique within the active selection list.
- `title`: Short label matching or clarifying the focused option.
- `summary`: One or two concise sentences describing what the option represents.
- `status`: Optional status detail such as lifecycle state, workflow step, configured state, or availability.
- `details`: Optional ordered facts that help the developer decide whether to select the option.
- `warnings`: Optional actionable warnings for missing, invalid, incomplete, or risky state.
- `nextStep`: Optional hint describing what selecting the option will do.

**Validation Rules**:

- `id`, `title`, and `summary` are required for item-specific context.
- `warnings` must be displayed before optional details when rows are constrained.
- A context update must not change the selected item or route stack.

## User Selection Area

Represents the lower region where the developer moves focus and chooses actions.

**Fields**:

- `items`: Ordered selectable options or prompt choices.
- `focusedItemId`: Stable identifier for the currently focused item.
- `visibleWindow`: Current visible row range for long lists.
- `activationAction`: Action invoked only when the developer confirms selection.

**Validation Rules**:

- Focus movement updates `focusedItemId` and may update `SelectedOptionContext`.
- Activation remains separate from focus and is triggered only by explicit selection input.
- The selection area remains visible during normal navigation.

## State Transitions

```text
Route enters -> fallback context rendered
Read model loads -> first focusable item context rendered
Focus changes -> selected context updates, route and files unchanged
Selection activates -> existing navigation or mutation flow runs
Terminal resizes -> layout rows recalculate, focused item and route preserved
Terminal below minimum -> minimum-size message rendered, session state preserved
Terminal restored -> normal regions render using preserved state
```

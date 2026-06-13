# UI Contract: Fullscreen Context Layout

## Purpose

This contract defines the visible behavior the interactive terminal app must provide after adding the context content area. It is written as a user-interface contract for tests and implementation tasks.

## Region Order

Every normal interactive screen uses this vertical order:

```text
Status Bar
Context Content Area
User Selection Area
Key Hints
```

The status bar remains above the context content area. The active selection or prompt remains below the context content area. Key hints may remain at the bottom as an existing global support region and must not displace required selection controls.

## Sizing Rules

- The shell occupies the available terminal height during normal operation.
- The status bar keeps a stable required height.
- The user selection area keeps enough height to show the current prompt, focused option, and required controls.
- Extra rows are assigned to the context content area.
- When rows are removed, the context content area shrinks first.
- When the terminal is below the minimum usable size, the shell renders a clear minimum-size message instead of overlapping regions.

## Focus Context Rules

- Each selectable row may provide a `SelectedOptionContext`.
- Moving focus updates the context content area within one visible redraw.
- Focus updates are read-only and must not invoke route changes, command orchestration, or file writes.
- Pressing Enter or another explicit activation key remains the only way to run the selected action.
- If a row lacks item-specific context, the content area shows section-level fallback context.

## Content Priority

When the content area has limited rows, render content in this priority order:

1. Context title
2. Blocking or actionable warnings
3. Status details
4. Summary
5. Next-step hint
6. Additional details

The content area may clip, summarize, or omit lower-priority details to preserve the status bar and selection area.

## Screen Coverage

The contract applies to:

- Main menu
- Task specs list and task spec detail flows
- Workflows list and workflow detail flows
- Agents list and add/remove flows
- Project metadata view and edit flows
- Setup and maintenance menu/actions

Mutation screens may show operation-specific context, but the context area itself remains informational and does not create new mutation semantics.

## Testable Outcomes

- In supported terminal sizes, rendered output shows status text before context text and context text before selection text.
- Moving list focus changes context text without changing route text.
- File snapshots remain unchanged after focus-only navigation.
- Reducing terminal height preserves the active focused item and route.
- Below the minimum usable height, normal controls are replaced by a minimum-size message with no overlapping content.

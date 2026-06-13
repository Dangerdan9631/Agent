# Quickstart: Ink Context Content Area

## Prerequisites

- Node.js 20 or newer.
- Dependencies installed with `npm install`.
- Existing interactive app implementation from `specs/002-ink-interactive-cli`.

## Validate Layout Tests

```powershell
npm test -- tests/unit/interactive/layout.test.ts
```

Expected outcome:

- Supported terminal heights render status, context, and selection regions in order.
- Extra rows are allocated to the context content area.
- Below-minimum terminal sizes render a minimum-size message.

## Validate Keyboard Component Tests

```powershell
npm test -- tests/unit/interactive/screens/keyboard-components.test.ts
```

Expected outcome:

- Selection focus remains visible in constrained lists.
- Focus movement can be tested independently from Enter activation.
- Existing global key hints still render correctly.

## Validate Read-Only Browse Behavior

```powershell
npm test -- tests/integration/interactive-browse.test.ts
```

Expected outcome:

- Main menu, task specs, workflows, agents, and project screens show context for the current route or focused item.
- Moving focus updates context text.
- File snapshots are unchanged after read-only navigation.

## Validate Full Interactive Test Suite

```powershell
npm test -- tests/unit/interactive tests/integration/interactive-browse.test.ts tests/integration/interactive-read-only.test.ts
```

Expected outcome:

- Existing navigation and mutation reachability remain intact.
- Focus-only context updates do not alter project files.
- Layout behavior remains stable across representative screen flows.

## Manual Smoke Scenario

1. Run `npm run build`.
2. Launch the local interactive CLI in a fixture or initialized project.
3. Resize the terminal between small, medium, and tall heights.
4. Move focus through the main menu, specs list, workflows list, and agents list.
5. Verify the status bar stays above context, the selection area stays below context, and context changes as focus moves.

Expected outcome:

- The app behaves like a fullscreen terminal workspace.
- The middle content area absorbs available vertical space.
- Selection controls remain usable and visible.

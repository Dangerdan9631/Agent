# Quickstart: Ink Route Layout and App Scaffolding

## Prerequisites

- Node.js 20 or newer.
- Dependencies installed with `npm install`.
- Existing interactive app from `specs/002-ink-interactive-cli` and content area work from `specs/003-ink-content-area`.

## Validate Scaffolding Layout Tests

```powershell
npm test -- tests/unit/interactive/layout.test.ts
```

Expected outcome:

- Status bar, route content area, and key hint overlay render in order.
- Status bar and key hint overlay keep fixed heights when terminal height changes.
- Extra terminal rows are allocated to the route content area only.
- Below-minimum terminal sizes render a minimum-size message.

## Validate Route Content Layout Tests

```powershell
npm test -- tests/unit/interactive/route-content-layout.test.ts
```

Expected outcome:

- Selection list height tracks visible option count.
- Content area fills remaining rows within the route slot after selection sizing.
- Option-count changes resize selection and content inversely within one redraw.

## Validate Key Hint Overlay Tests

```powershell
npm test -- tests/unit/interactive/key-hint-overlay.test.ts
```

Expected outcome:

- Hint text is horizontally centered.
- Overlay keeps fixed height when hints are toggled hidden.
- Route-specific hints appear alongside global defaults.

## Validate Keyboard and Focus Tests

```powershell
npm test -- tests/unit/interactive/screens/keyboard-components.test.ts
```

Expected outcome:

- Focus movement remains separate from Enter activation.
- Focus updates route content without file mutations.

## Validate Read-Only Browse Behavior

```powershell
npm test -- tests/integration/interactive-browse.test.ts
```

Expected outcome:

- Main menu, specs list, workflows list, agents list, and project view show route-owned content and selection.
- Moving focus updates content within the route slot.
- File snapshots are unchanged after read-only navigation.

## Validate Full Interactive Suite

```powershell
npm test -- tests/unit/interactive tests/integration/interactive-browse.test.ts tests/integration/interactive-read-only.test.ts
```

Expected outcome:

- Existing navigation and mutation reachability remain intact.
- Layout contracts from `contracts/ui-layout.md` hold across representative routes.

## Manual Smoke Scenario

1. Run `npm run build`.
2. Launch the interactive CLI in an initialized fixture project.
3. Resize the terminal between small, medium, and tall heights.
4. Visit main menu, task specs list, and workflows list.
5. Toggle key hints with `?` and confirm overlay height stays stable.
6. Move focus through list options and confirm content updates above the selection list.

Expected outcome:

- Fixed status bar at top and centered key hints at bottom frame every route.
- Middle region changes per route with selection lists sized to their options.
- Content area above each list uses remaining space.

## Contract Reference

- Layout behavior: `specs/004-ink-route-layout/contracts/ui-layout.md`
- Data shapes: `specs/004-ink-route-layout/data-model.md`

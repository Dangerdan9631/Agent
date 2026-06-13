# Research: Ink Route Layout and App Scaffolding

## Decision: App shell owns three fixed-order regions with two fixed chrome heights

**Rationale**: Feature 003 introduced a flexible middle region but still bundled selection controls and key hints in the bottom shell band, with key-hint visibility changing allocated rows. Spec 004 requires status bar and key hint overlay to remain fixed-height chrome while the entire middle slot is route-owned. Separating key hints from selection sizing makes resize behavior predictable and matches the stated scaffolding model.

**Alternatives considered**:

- Keep key hints inside the selection band and only center the text: rejected because hint visibility would still change shell geometry and selection would not be route-owned.
- Make key hints part of each route: rejected because global shortcuts (`q`, `b`, `?`) should remain visible and consistent across routes.

## Decision: Route content slot is fully owned by the active route

**Rationale**: `AppShell` currently renders `ContextContent` globally and places routed screens only in the selection band. Spec 004 requires each route to define the entire middle presentation. Moving route rendering into a single `routeContentRows`-high slot lets list/detail/form routes choose their own interior without the shell guessing layout.

**Alternatives considered**:

- Shell continues to render context while routes render only selection: rejected because it prevents routes from using the full slot for forms or full-screen lists and violates per-route ownership.
- Two shell modes (with/without content layout): rejected because it duplicates minimum-size logic and splits ownership across shell and routes.

## Decision: Introduce a reusable `RouteContentLayout` for content + selection routes

**Rationale**: Most navigation routes need an upper informational region and a lower option list whose height tracks option count. A shared layout component encapsulates the rule "selection list sizes to visible options; content fills remainder" and keeps individual screens focused on data, not row math.

**Alternatives considered**:

- Duplicate content/selection `Box` composition in every list screen: rejected because row allocation and overflow rules would drift across screens.
- One mega route renderer with switches per route: rejected because it hides route-specific composition and violates local reasoning.

## Decision: Two-stage row allocation (scaffolding, then route content)

**Rationale**: Shell allocation should subtract only fixed status rows and fixed key-hint rows, assigning all remaining rows to `routeContentRows`. Route layouts that use `RouteContentLayout` then subtract reported selection rows and assign the rest to the content sub-region. This mirrors the existing `allocateFullscreenLayout` helper but with clearer region names aligned to the spec.

**Alternatives considered**:

- Single-pass allocation from leaf controls up to shell: rejected for initial scope because it couples route interiors to shell constants and complicates testing.
- Hard-coded per-route row budgets: rejected because option counts vary and would break the "selection sizes to option count" requirement.

## Decision: Key hint overlay always reserves fixed rows and centers hint text

**Rationale**: Spec 004 treats the overlay as fixed chrome. Even when hints are toggled off or a route supplies no custom hints, the reserved rows prevent layout jump. Centering uses Ink `Box` horizontal alignment so wide terminals present guidance as a single centered group.

**Alternatives considered**:

- Collapse overlay to zero rows when hidden: rejected because it changes shell geometry and conflicts with fixed-height requirement.
- Left-aligned hints with manual padding: rejected because spec explicitly requires centered content.

## Decision: Per-route key hints via optional route metadata

**Rationale**: Global shortcuts remain the default overlay content. Routes may append or replace supplemental hints (for example, numeric menu keys on the main menu) through a small route-level hint descriptor resolved alongside route titles in `navigation.ts` or a dedicated hints module. The overlay renderer stays presentation-only.

**Alternatives considered**:

- Hard-code all hints in `KeyHintOverlay`: rejected because route-specific affordances would require overlay to know every screen.
- Push hint strings into every screen component without a shared type: rejected because formatting and centering rules would duplicate.

## Decision: Preserve focus/activation separation from feature 003

**Rationale**: Moving selection inside route-owned layouts must not regress the read-only focus contract. `SelectableList` focus callbacks continue to update route content without activation, and Enter remains the activation path.

**Alternatives considered**:

- Couple focus changes to route-level state in the shell: rejected because content ownership belongs to the route layout, not global shell state.

## Decision: Incremental migration of existing screens onto `RouteContentLayout`

**Rationale**: Feature 003 already wires list screens with `onContextChange` and `useSelectionRowContribution`. Migration rehomes that content into each route's upper slot via `RouteContentLayout` while non-list routes (forms, confirmations) use the full route slot directly.

**Alternatives considered**:

- Big-bang rewrite of all screens before shipping shell changes: rejected because it increases risk and delays the scaffolding correction.
- Only migrate main menu: rejected because success criteria require multiple routes demonstrating distinct per-route content.

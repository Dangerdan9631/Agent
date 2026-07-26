# Atlas: TypeScript Architecture Observatory

## 1. Product definition

Build **Atlas**, a standalone, development-only command-line tool for understanding and enforcing the architecture of a TypeScript project or monorepo.

Atlas has two equally important jobs:

1. **Enforcement:** evaluate declared dependency rules and fail with actionable diagnostics when source code violates them.
2. **Understanding:** generate and serve interactive, type-aware architecture diagrams and dependency matrices that reveal package, API, folder, and declaration relationships.

Atlas must be usable in a new TypeScript repository without relying on conventions, source files, package names, paths, or configuration from any other project. All repository-specific behavior must be expressed through discovery or a user-owned configuration file.

Atlas is a development tool. Production packages must not depend on it, and it must not participate in the runtime dependency graph of the project being analysed.

## 2. Goals and non-goals

### Goals

- Validate architectural boundaries in local development and CI.
- Make package-level, public-API-level, and implementation-level relationships explorable.
- Produce deterministic, reviewable generated artifacts that can be checked into source control.
- Preserve intentional visual curation, such as node positions and hidden connections, separately from generated graph data.
- Support both single-package repositories and multi-package workspaces.

### Non-goals

- Atlas is not a general-purpose UML editor or a runtime tracing tool.
- Atlas does not infer business-domain rules from names or folder structures; users declare policy explicitly.
- Atlas does not modify application source code.
- Atlas does not require network access while generating, validating, laying out, or viewing artifacts.

## 3. Terminology

- **Workspace:** the repository root selected for an Atlas invocation.
- **Package:** an analysable TypeScript unit discovered from configured workspace package roots. A repository may have one package.
- **Runtime package:** a package included in architecture reports and runtime dependency rules.
- **Support package:** a package excluded from runtime architecture, such as tests, build tools, or Atlas itself.
- **Declaration graph:** a directed graph of TypeScript declarations, module nodes, and semantic relationships.
- **Diagram:** a rendered graph view and its matching data, matrix, persisted layout, and optional PNG export.
- **Landscape:** the workspace-wide diagram of cross-package and external dependencies.
- **Layout:** persisted node positions, parent relationships, and intentionally hidden connections for one diagram. Layout is not architecture policy.

## 4. User-facing behavior

### 4.1 CLI

Provide an executable named `atlas` (or the configured package binary name). Commands must have non-zero exit status on invalid arguments, configuration errors, validation failures, or generation failures. Human-readable command output belongs on stdout/stderr only through a dedicated output adapter; diagnostics must use the project logging boundary.

| Command | Required behavior |
| --- | --- |
| `atlas validate` | Discover packages, run all declared architecture rules, print actionable violations, and exit non-zero when any error-severity rule fails. It must not rewrite diagrams or layouts. |
| `atlas generate` | Validate by default, build semantic graphs, and write all configured artifacts. `--no-validate` permits diagram regeneration without enforcement. Existing layout files must be retained and cleaned against the new graph rather than discarded. |
| `atlas diagram <scope>` | Generate only a requested scope: `landscape`, `package:<name>`, or `folder:<package>:<path>`. It must reject unknown package and folder scopes. It validates by default and supports `--no-validate`. |
| `atlas layout <scope>` | Deterministically compute and persist positions for a generated graph scope. It must support `--rows <positive-integer>`, `--horizontal-gap <non-negative-number>`, `--vertical-gap <non-negative-number>`, `--orientation <horizontal|vertical>`, and `--force`. Without `--force`, manually positioned nodes that have valid saved positions remain fixed and only unpositioned nodes are laid out. |
| `atlas view` | Serve artifacts from the artifact root on a loopback host by default. Support `--host <host>`, `--port <port>`, and `--open`. The root page must open the landscape diagram. |
| `atlas clean` | Remove only regenerable artifact files under the configured artifact root. It must require `--confirm` before deletion and must never delete the root configuration file or files outside the artifact root. |

Global options must include `--workspace <absolute-or-relative-path>`, `--config <path>`, `--output <path>`, `--log-level <level>`, and `--help`. Every command must log the resolved workspace root, config path, selected scope, included packages, and output root.

### 4.2 Expected workflows

```text
# Enforce architecture in CI.
atlas validate

# Regenerate all reports after a change.
atlas generate

# Reflow the workspace landscape deterministically.
atlas layout landscape --rows 6 --horizontal-gap 80 --vertical-gap 60

# Lay out one package without moving curated node positions.
atlas layout package:billing

# Force a fresh layout for a focused subsystem.
atlas layout folder:billing:src/application --force

# Explore the checked-in results locally.
atlas view --open
```

## 5. Architecture and implementation constraints

Use layered, object-oriented design:

- **Application layer:** local graph models, rule/policy interpretation, configuration interpretation, auto-layout orchestration, and artifact-generation workflows.
- **Infrastructure layer:** filesystem access, workspace/package discovery, dependency-analysis process execution, TypeScript compiler API traversal, HTML/JSON/matrix writing, image writing, and the local HTTP server.
- **Composition layer:** constructs and injects concrete implementations.
- **Presentation layer:** parses CLI arguments and translates commands into application requests.

Application behavior must depend on narrow local interfaces, not on filesystem, HTTP, browser, TypeScript compiler, or dependency-analyser concrete types. Tool output formats must be adapted before they reach application graph logic. Constructors wire dependencies only; they must not perform I/O or business work.

Use the project logging framework for diagnostic output. Log important decisions and resolved configuration so a command can be understood from logs alone.

## 6. Discovery, configuration, and rule enforcement

### 6.1 Discovery

- Discover packages from one or more configurable roots or workspace globs.
- Read each package manifest to obtain its name, absolute root, source roots, and declared dependencies.
- Support a single-package project by treating the workspace root as one package when no package workspaces are configured.
- Apply an explicit inclusion policy. Do not infer that a package is a runtime package merely from its name.
- Allow configuration to include, exclude, or classify packages as runtime or support packages.

### 6.2 Configuration

Load a user-owned configuration file from the workspace root by default. A JavaScript/CommonJS, JSON, or TypeScript configuration format is acceptable, but the tool must document one canonical format and validate its schema before use.

The configuration must support:

- workspace/package discovery roots and source roots;
- artifact output root;
- package classifications;
- dependency rules and severity;
- landscape external dependency exclusions;
- global, package-specific, and folder-specific source-node exclusions, including normalized slash-separated glob patterns;
- collapsed external dependencies;
- optional splitting of one external dependency into separately keyed, identically labelled nodes per importing package;
- opt-in folder diagrams with titles and inherited/overridden exclusions and collapse settings;
- default auto-layout settings.

Configuration is architecture policy. Diagram layout files are separate, generated-and-curated state and must never be embedded into policy configuration.

### 6.3 Rules

Run a dependency-analysis adapter for every included package and preserve its raw machine-readable report under the artifact root. The adapter may use dependency-cruiser or an equivalent analyser, but the application rule model must not expose that vendor's schema.

The initial rule set must support:

- no circular dependency;
- no runtime-package dependency on a support package;
- configurable allowed/forbidden dependency directions between package classes or named layers;
- configurable forbidden imports and forbidden external dependencies;
- configurable severity (`error` or `warning`).

Each violation must identify the rule, source package/file, target package/file or module, relationship path when available, and a remediation-oriented message. Error violations fail `atlas validate` and generation commands that validate.

## 7. Semantic graph

Build a workspace-wide declaration graph with the TypeScript compiler API. A file-import graph alone is insufficient for the diagrams.

### 7.1 Nodes

Create stable nodes for named top-level:

- classes;
- interfaces;
- type aliases;
- enums;
- a synthetic module node for top-level functions and values in a source file.

Each node must include a stable ID, display label, kind, owning package, workspace-relative source path, and module-node flag. IDs must be derived from normalized workspace-relative paths and declaration names, not absolute machine paths.

### 7.2 Relationships

Create directed relationships with stable IDs:

- `reference` for normal type and value use;
- `inheritance` for TypeScript `extends` and `implements` clauses.

Resolve relative imports, configured internal aliases, workspace package entrypoints, and named re-exports. When a named import comes through a package entrypoint, identify the backing source declaration when resolution is safe. Normalize unresolved imports as stable external nodes such as `external:package-name` or `external:node:fs`.

When resolution is ambiguous or unsafe, retain the import as an external/package-level edge rather than guessing a declaration target.

## 8. Generated diagrams and matrices

Write all artifacts under one configurable artifact root, for example `architecture/`. All generated paths must remain inside that root.

Generate:

1. A **landscape** graph showing cross-package declaration relationships and external dependencies.
2. One **package** graph for every included runtime package.
3. **Folder** graphs only for explicitly configured folders.
4. A dependency matrix HTML page for every graph.
5. Raw dependency-analysis reports for every analysed package.

For every graph write:

- Cytoscape-compatible JSON elements;
- self-contained HTML viewer page;
- matching dependency matrix HTML page;
- optional sibling layout file and PNG export.

Generate one always-expanded navigation tree linking all landscape, package, folder, graph, and matrix pages.

### 8.1 Rendering semantics

- Use compound nodes for packages and directory hierarchy.
- Style class, interface, and other declaration nodes distinctly.
- Render `reference` edges solid and `inheritance` edges dashed.
- In package diagrams, include the package's declarations and only directly referenced declarations from another workspace package. Place those external declarations in a sibling compound group. Do not include unrelated or transitive declarations.
- In folder diagrams, include only declarations in the configured folder and model references outside the scope as external/package boundaries.
- In landscape diagrams, show cross-package relationships and selected external imports, then prune disconnected nodes only after applying exclusions while preserving necessary package/directory parents.
- Resolve public API imports to their owning source files when safe, rather than drawing every import to `src/index.ts`.

## 9. Deterministic auto-layout

Atlas must implement a deterministic hierarchical layout algorithm in application code. A browser library may render the results, but generated layout must not depend on browser viewport size, random seeds, machine-specific font measurement, iteration order of hash maps, or a third-party layout engine's unspecified ordering.

### 9.1 Inputs and outputs

Input is a graph containing compound nodes, leaf nodes, directed edges, optional persisted node positions, and layout settings:

- `orientation`: `horizontal` or `vertical`, default `horizontal`;
- `rows`: maximum leaf nodes per row within a sibling group, positive integer, default 6;
- `horizontalGap`: minimum gap between adjacent rendered node/group bounds, non-negative number, default 80;
- `verticalGap`: minimum gap between adjacent rows/columns, non-negative number, default 60;
- `force`: whether valid persisted positions may be replaced, default false.

Output is a layout document with schema version, each live node's `parentId` and absolute model coordinates, and the existing valid hidden-connection IDs. Coordinates use the graph renderer's model coordinate system. Repeated runs with equivalent graph data, layout settings, and retained positions must produce byte-for-byte equivalent layout JSON after normal JSON formatting.

### 9.2 Canonical ordering

Before placement, normalize all IDs and sort:

1. groups before leaves;
2. sibling groups by normalized display label, then stable ID;
3. sibling leaf nodes by a deterministic dependency order, then normalized label, then stable ID;
4. edges by source ID, target ID, then relationship type.

The dependency order for a sibling set is calculated by:

1. retaining only directed edges whose endpoints are in that sibling set;
2. condensing strongly connected components into a directed acyclic graph;
3. topologically ordering components, choosing the component with the smallest canonical member key whenever more than one component is ready;
4. ordering members inside a cyclic component by canonical member key.

This makes cycles display predictably without claiming that they are acyclic.

### 9.3 Placement algorithm

Apply the following algorithm recursively from the deepest compound group to the root:

1. **Clean saved state.** Discard saved positions for nodes no longer present, positions with non-finite coordinates, and parent IDs that do not match the graph. Retain valid positions unless `force` is true.
2. **Lay out children.** For each compound group, recursively lay out child compound groups first. Treat each completed child group as a rectangular item whose width and height include its descendants and group padding.
3. **Partition fixed and movable items.** An item is fixed only when it has a retained saved position. All other items are movable. Fixed items keep their coordinates exactly unless `force` is true.
4. **Assign movable items to flow slots.** Enumerate row-major slots using canonical sibling dependency order. A row contains at most `rows` items. Slot widths are based on the maximum item width in that column; slot heights are based on the maximum item height in that row. Horizontal and vertical gaps are measured between item bounds, not centres.
5. **Avoid fixed items.** For each movable item, choose the first canonical slot that does not overlap a fixed item's bounds plus the configured gap. If occupied, advance to the next slot, extending rows as necessary. Do not move fixed items to resolve overlaps.
6. **Place items.** In horizontal orientation, columns advance on the x-axis and rows advance on the y-axis. In vertical orientation, transpose the resulting x/y coordinates and item bounds while preserving the supplied horizontal and vertical gap meanings on their corresponding visual axes.
7. **Size and place groups.** Compute each compound group's bounds as the union of its child bounds plus deterministic padding. Position child coordinates relative to the group according to the renderer's compound-node convention. At the root, translate all non-fixed movable coordinates so the minimum layout coordinate is `(0, 0)` while leaving retained fixed coordinates unchanged.
8. **Round and persist.** Round generated coordinates to a documented fixed precision, for example three decimal places. Serialize keys and hidden edge IDs in canonical sorted order with one trailing newline.

The algorithm may use declared, fixed node dimensions for reproducibility. If the renderer supports variable dimensions, the artifact writer must supply deterministic dimensions derived from node category and a documented label-length rule, or persist dimensions with the graph JSON. It must not use runtime browser measurements as layout input.

### 9.4 Layout command behavior

- `atlas layout <scope>` reads the matching graph JSON and existing layout file, runs the algorithm, and writes only that scope's `*.layout.json`.
- It must not regenerate semantic graph data unless an explicit `--generate` option is supplied.
- `--force` replaces all valid saved positions with generated positions.
- The command reports the selected diagram, fixed/moved node counts, settings, and output file.
- The viewer's “auto layout” action must call the same algorithm or a server endpoint backed by the same application service. Browser-only layout logic is not acceptable.

## 10. Interactive viewer and persistence

Serve generated artifacts safely from the artifact root. The root URL opens the landscape diagram.

The viewer must support search, inbound/outbound dependency focus, external dependency visibility, node/group selection, temporary compound-group collapse, the shared auto-layout operation, optional vertical orientation, configurable gaps/row count/grid snapping, dark mode stored in browser-local storage, and PNG export of the current or all graph diagrams.

Autosave layout to a sibling `*.layout.json` file through the local server. Persist only valid live node positions, matching parent IDs, and intentionally hidden edge IDs; discard stale entries. Version the layout schema. Save PNG exports beside their diagram and replace the prior export atomically where the filesystem supports it.

The viewer may provide configuration actions that update the root configuration and regenerate artifacts: hide an external dependency, hide a source node, add/remove exclusions, split/unsplit a landscape external dependency, and create a folder diagram from a selected folder. Validate all HTTP input, reject path traversal, constrain reads/writes to the artifact root or explicitly configured policy file, and accept only valid image formats.

## 11. Verification and acceptance criteria

The implementation is complete only when all of the following are verified:

- `atlas validate` detects cycles and configured forbidden dependency directions, reports actionable violations, and has correct exit status.
- `atlas generate` produces landscape, package, configured folder, graph JSON, HTML, matrix, and raw analysis artifacts in a clean fixture workspace.
- `atlas diagram <scope>` regenerates only the requested valid scope and rejects invalid scopes.
- `atlas layout <scope>` produces stable layout JSON across two runs with identical inputs.
- Auto-layout respects row limits, orientation, configured boundary gaps, compound groups, cycles, and retained manual positions; `--force` replaces retained positions.
- Graph tests cover declaration discovery, inheritance/reference semantics, external dependency normalization, public re-export resolution, scope filtering, exclusions, collapse, and splitting.
- Configuration tests cover schema validation, inheritance/overrides, normalized glob matching, package classification, and default layout settings.
- Viewer integration tests cover static serving, root routing, malformed input rejection, path traversal rejection, layout cleanup, auto-layout endpoint/command use, config actions, and PNG replacement.
- CLI integration tests cover argument validation, exit codes, `--no-validate`, `--confirm` for clean, and output-root containment.
- The generated artifacts and retained layout files are safe to commit and do not include absolute workstation paths.

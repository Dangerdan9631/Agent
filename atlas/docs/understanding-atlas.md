# Understanding Atlas output

Atlas answers two related questions about a codebase:

1. **What architectural relationships exist?** The diagrams and dependency
   matrices project declarations and their static relationships into scopes that
   are easier to explore.
2. **Which of those relationships violate declared policy?** Validation evaluates
   the normalized dependency facts against the rules in `atlas.config.json`.

Those answers come from the same language-neutral input, but they are not the
same operation. Diagram exclusions, collapsed groups, hidden connections, and
saved positions change presentation only. They do not make a dependency valid,
remove it from validation, or change the source architecture.

## The processing model

The easiest way to understand an Atlas artifact is to follow the projections
that produced it:

```text
TypeScript source ─┐
Kotlin source/KSP ─┼─> module models ─> workspace manifest ─> resolved workspace
Ruby/Rails source ─┤                                      │
C#/Roslyn source ──┘                                      │
                                                          ├─> dependency facts ─> rules
                                                          │
                                                          └─> declaration graph
                                                                 │
                                                                 ├─> scoped diagram
                                                                 └─> dependency matrix
```

A language generator owns the first mapping. `atlas-cli` owns everything after
the manifest. This boundary is what lets Atlas compare and federate different
languages without exposing TypeScript compiler objects, Kotlin PSI/KSP objects,
Ruby Prism nodes, Roslyn symbols, MSBuild types, Gradle types, or
dependency-analyzer vendor records to its core.

Atlas performs static analysis. An arrow means Atlas found a source-level fact;
it does not mean that a call occurred at runtime, that the dependency is heavily
used, or that Atlas inferred the business significance of the relationship.

## The portable architecture model

The intermediate abstraction is the version-one **Atlas module model**. It is a
deterministic JSON document describing one independently generated artifact.
The workspace manifest lists the models selected for one Atlas run.

### Artifact identity

Every module model contains an artifact identity:

| Field         | Meaning                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `id`          | Opaque, stable module identity used to join models. Atlas does not parse ecosystem meaning from it. |
| `displayName` | Human-readable module name.                                                                         |
| `version`     | Published or build-provided artifact version.                                                       |
| `variant`     | Optional target or build variant.                                                                   |
| `category`    | Broad artifact family, such as `npm-package` or `jvm`.                                              |

The model also carries `sourceLanguage` alongside the artifact identity. It is
presentation metadata such as `typescript`, `kotlin`, or `ruby`, not architecture
policy.

An npm package name and a Gradle coordinate can therefore occupy the same
conceptual role without pretending to have the same naming rules.

### Elements: the declaration building blocks

An **element** is a declaration owned by exactly one artifact. Its principal
fields are:

| Field           | Meaning                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`            | Stable declaration identity. Relationships use this value, so display names can change independently of graph linking. |
| `name`          | Short display name.                                                                                                    |
| `kind`          | Language-neutral declaration category.                                                                                 |
| `qualifiedName` | Normalized declaration identity in the source ecosystem.                                                               |
| `signature`     | Optional overload discriminator for callables.                                                                         |
| `parentId`      | Optional owner in the declaration tree.                                                                                |
| `sourcePath`    | Optional normalized path relative to the owning module. Absolute workstation paths are not allowed.                    |
| `traits`        | Additional portable facts such as `singleton`, `mutable`, `sealed`, or `suspend`.                                      |

The supported element kinds form a vocabulary broad enough for multiple
object-oriented languages:

| Family      | Portable kinds                                                                           | What they represent                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Ownership   | `namespace`, `source-unit`                                                               | A package/namespace and a source file or equivalent compilation unit.                                                |
| Named types | `class`, `interface`, `struct`, `record`, `enum`, `annotation`, `delegate`, `type-alias` | Reusable type declarations. Some kinds are present for generators beyond the current TypeScript and Kotlin mappings. |
| Behavior    | `function`, `constructor`, `method`                                                      | Top-level or type-owned callable declarations.                                                                       |
| State       | `property`, `field`, `constant`                                                          | Named stored or computed values.                                                                                     |

`parentId` makes these primitives composable. A source unit can belong to a
namespace, a class can belong to a source unit, and a method can belong to a
class. The portable model retains that semantic tree even when a particular
diagram chooses a flatter presentation.

### Relationships: the graph building blocks

A **relationship** is directed from an element owned by the current model to a
target. Its `sourceElementId` must name an owned element, and its kind is one of:

| Kind         | Meaning                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `imports`    | The source unit imports a target name or artifact.                                                  |
| `references` | The source declaration uses the target as a type or value.                                          |
| `inherits`   | The source derives from the target.                                                                 |
| `implements` | The source fulfills the target contract.                                                            |
| `calls`      | The source invokes the target. Generators emit calls only when the target can be safely attributed. |
| `contains`   | The source owns the target. This is structural rather than a dependency for validation.             |

The target can identify:

- an element in the same model with `elementId`;
- an element in another model with `moduleId` and `elementId`;
- only another module with `moduleId`; or
- an unresolved external or qualified name with `label`.

This graduated target shape is intentional. A generator records a precise
target when it can prove one and retains a useful boundary label when it cannot.
It should not guess across ambiguous imports or declarations.

### Manifest linking and model validation

`atlas-workspace.json` is deliberately small: each entry pairs the expected
`moduleId` with a manifest-relative model path. When Atlas loads it, it validates
the model and linking contract before architecture rules run. Among other
checks, Atlas rejects escaping model paths, mismatched module identities,
duplicate module/element/relationship IDs, unknown local parents or targets,
absolute source paths, and unsupported kinds.

Targets are then linked in this order:

1. Use an explicit target module and element identity when supplied.
2. Use an explicit module-only target as an artifact boundary.
3. For a label-only target, link it to an element only when its qualified name
   is unique across all loaded models.
4. Preserve anything missing or ambiguous as an external placeholder.

This linking behavior is important when reading an external node: "external"
means Atlas could not link that target to a declaration in the selected models.
It does not necessarily mean the dependency is outside the repository.

## How the supported languages map into the model

The mappings preserve the facts each compiler front end can determine safely.
They are not expected to produce identical declaration detail.

### TypeScript

`atlas-ts` uses the TypeScript compiler and type checker, with configured
`tsconfig` options when available.

| TypeScript source concept                                   | Portable representation                                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| npm package                                                 | Artifact whose `id` and `displayName` are the package name, `version` comes from `package.json`, and `category` is `npm-package`.       |
| Source file with emitted declarations                       | `source-unit` parent element.                                                                                                           |
| Top-level named class                                       | `class` element.                                                                                                                        |
| Top-level interface                                         | `interface` element.                                                                                                                    |
| Top-level type alias                                        | `type-alias` element.                                                                                                                   |
| Top-level enum                                              | `enum` element.                                                                                                                         |
| Top-level named function                                    | `function` element.                                                                                                                     |
| Top-level `const` variable                                  | `constant` element.                                                                                                                     |
| Top-level `let` or `var` variable                           | `field` element.                                                                                                                        |
| `extends` or `implements` clause                            | `inherits` relationship in the portable model. The current TypeScript extraction uses one common inheritance category for both clauses. |
| Type or value use resolved by the checker                   | `references` relationship.                                                                                                              |
| Import that cannot be resolved to selected workspace source | External `references` target normalized to the package root, scoped package root, or `node:` built-in root.                             |

References found inside a class or function are attributed to that top-level
declaration. Methods and properties are not currently emitted as independent
TypeScript elements. Named imports, aliases, workspace entry points, and safe
re-exports are resolved through compiler symbols so an edge can point at the
backing declaration instead of stopping at an index file. Ambiguous or
non-workspace imports remain external.

### Kotlin

`atlas-kt` parses Kotlin PSI into compiler-independent facts. Optional KSP
semantic fragments replace lexical relationship facts where KSP has a more
authoritative target and can add semantic traits.

| Kotlin source concept                                             | Portable representation                                                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Gradle/CLI module                                                 | Artifact identity supplied by the build adapter, commonly a `group:name:version`-style ID and a category such as `jvm`. |
| `package` declaration                                             | `namespace` element.                                                                                                    |
| Kotlin file                                                       | `source-unit` child of its namespace.                                                                                   |
| Class                                                             | `class` element.                                                                                                        |
| `object` or companion object                                      | `class` with `singleton` and, when applicable, `companion` traits.                                                      |
| Interface                                                         | `interface` element.                                                                                                    |
| Enum class                                                        | `enum`; each enum entry is a `constant`.                                                                                |
| Annotation class                                                  | `annotation` element.                                                                                                   |
| Type alias                                                        | `type-alias` element.                                                                                                   |
| Member function                                                   | `method` with an overload signature.                                                                                    |
| Secondary constructor                                             | `constructor` with an overload signature.                                                                               |
| Property, including primary-constructor `val`/`var`               | `property`; mutable properties carry the `mutable` trait.                                                               |
| `const val`                                                       | `constant` with the `const` trait.                                                                                      |
| Imported name                                                     | `imports` relationship from the source unit to a qualified label.                                                       |
| Named parameter, return, receiver, bound, property, or alias type | `references` relationship.                                                                                              |
| Supertype                                                         | `inherits` or `implements`, based on the declaration and supertype syntax or resolved target.                           |

Top-level functions and top-level constants are folded into the Kotlin source
unit, so their relationships originate at the file node. Type-owned methods and
constants remain distinct elements. The extractor also records traits such as
`data`, `sealed`, `value`, `functional`, `lateinit`, `suspend`, `inline`,
`operator`, and `infix` where applicable. Kotlin built-in types, type parameters,
and common Java platform types refined by KSP are suppressed as architectural
noise.

KSP fragments can refine `references`, `inherits`, and `implements` targets.
They are merged into the same portable records; KSP types and compiler paths do
not cross the model boundary.

### Ruby

`atlas-rb` uses Prism to parse Ruby source and recognizes a bounded set of
literal Rails conventions. It never loads application classes. Gem metadata is
read from one gemspec per selected package; a gemless root uses a derived or
command-provided application identity.

| Ruby source concept                                          | Portable representation                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Gem or gemless root application                              | `ruby-gem` or `ruby-application` artifact with `sourceLanguage: ruby`.                             |
| Ruby file                                                    | `source-unit` element.                                                                             |
| Module                                                       | `namespace` element; reopening a module in another file remains a distinct source declaration.     |
| Class                                                        | `class` element.                                                                                   |
| Instance or singleton method                                 | `method`; singleton methods carry the `singleton` trait.                                           |
| `initialize`                                                 | `constructor` element.                                                                             |
| Top-level method                                             | Source-qualified `function` element.                                                               |
| Constant assignment                                          | `constant` element.                                                                                |
| Literal `require`, `require_relative`, `load`, or `autoload` | `imports` relationship from the source unit.                                                       |
| Class superclass                                             | `inherits` relationship.                                                                           |
| `include` or `prepend`; `extend`                             | `implements` for instance mixins; `references` for singleton extension.                            |
| Safely attributable constant use                             | `references`, resolved across source roots, gems, and Zeitwerk-style names when unique.            |
| Rails association or explicit validator                      | `references` to the inferred, `class_name`, join, or validator class when statically identifiable. |
| Rails callback, safe delegate, or route                      | `calls` to a literal method/controller action; mounted engines use `references`.                   |

Rails macros do not synthesize association accessors, enum methods, scopes, or
other framework-generated declaration nodes. Dynamic arguments remain absent
rather than being guessed. Ruby built-in constants are suppressed, and a target
that is missing or ambiguous remains a label-only external placeholder.

### C#

`atlas-cs` loads SDK-style projects through MSBuild and uses Roslyn symbols and
semantic models. Each selected target framework becomes a separate module so
framework-specific compilation results never overwrite one another.

| C# source concept                              | Portable representation                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Project target                                 | Artifact ID `<PackageId>@<TargetFramework>`, with assembly/project fallbacks when `PackageId` is absent.    |
| Namespace                                      | `namespace` element with structural `contains` relationships.                                               |
| Physical or source-generated document          | `source-unit`; generated paths live under deterministic `generated/` paths rather than machine directories. |
| Class, interface, struct, record, or enum      | Matching `class`, `interface`, `struct`, `record`, or `enum` element.                                       |
| Delegate or attribute class                    | `delegate` or `annotation` element.                                                                         |
| Constructor, method, property, field, or event | Matching member element with a compiler-derived overload signature and relevant traits.                     |
| Base class or implemented interface            | `inherits` or `implements` relationship resolved to the declaring symbol.                                   |
| `using` directive                              | `imports` relationship from its source unit.                                                                |
| Type use                                       | `references` relationship.                                                                                  |
| Invocation                                     | `calls` relationship resolved through the semantic model.                                                   |

Workspace linking upgrades compiler-resolved targets to same-module or
cross-module element IDs when their declaring project target is selected.
Targets outside the selected workspace remain useful qualified labels. The
generator fails on compilation errors because incomplete compiler state would
make apparently valid diagrams misleading.

### Contract richness versus current extraction

The portable vocabulary intentionally includes concepts that individual
generators may not emit. This is a stable integration surface for other
language adapters, not evidence that Atlas has inferred those facts in every
workspace.

## What Atlas validates

Validation first projects every non-`contains` relationship into a normalized
dependency fact with source path, optional target path, source/target module
identity, a target or import label, and any detected cycle path. Rules operate
on that projection, independently of how a graph is laid out or filtered.

Atlas supports these rule types:

| Rule                    | What is checked                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-circular`           | Directed declaration relationships and module-only relationships are checked for a return path. Atlas reports each canonical cycle once.                                   |
| `no-runtime-to-support` | A direct dependency whose source package is classified `runtime` must not target a package classified `support`.                                                           |
| `dependency-direction`  | For sources selected by module/package name, package class, or named layer, `allow-only` rejects targets outside the `to` selector and `forbid` rejects targets inside it. |
| `forbidden-import`      | The dependency adapter's import/target specifier is matched against configured globs, optionally only from selected sources.                                               |
| `forbidden-external`    | An unresolved non-relative dependency's package root is matched against forbidden package globs, optionally only from selected sources.                                    |

Selector branches are alternatives: matching an exact `moduleId`/package name,
one of the package's configured `classes`, or one of the named `layers` selects
the endpoint. A layer matches its `sourceGlobs` and, when configured, its package
names. These are declared policies; Atlas does not infer layers from folder
names.

With direct source analysis, `forbidden-import` sees the source import spelling.
With a version-one federated manifest, the portable relationship does not have a
separate original-import field, so the normalized target module or label is the
specifier available to that rule. Prefer stable module/package patterns when a
policy must behave the same across language adapters.

An `error` violation makes `validate` fail and prevents normal generation. A
`warning` is reported but does not fail the command. `generate --no-validate`
only bypasses enforcement for that generation run; it does not alter policy.

## How the intermediate model becomes a diagram

The current renderer uses a deliberately smaller graph vocabulary. It maps
portable declarations as follows:

| Portable kinds                            | Diagram node kind |
| ----------------------------------------- | ----------------- |
| `interface`                               | Interface         |
| `type-alias`, `delegate`                  | Type alias        |
| `enum`                                    | Enum              |
| `function`, `method`, `constructor`       | Function          |
| `property`, `field`                       | Field             |
| `constant`                                | Constant          |
| `source-unit`, `namespace`                | Module            |
| `class`, `struct`, `record`, `annotation` | Class             |

Similarly, `inherits` and `implements` become a diagram **inheritance** edge;
every other relationship becomes a **reference** edge. The relationship remains
directed from the depending source to the dependency target.

In the graph:

- classes are blue, interfaces are teal, other declarations are amber, and
  unresolved external targets are gray;
- reference edges are solid and inheritance/implementation edges are dashed;
- arrows point from the declaration that uses or derives to the declaration it
  depends on;
- inbound focus is green and outbound focus is blue.

The portable `parentId` declaration tree is not the visual containment tree in
the current viewer. The viewer places declarations inside generated compound
nodes based on artifact ownership and source paths:

```text
package/module
└── source directory
    └── nested source directory
        └── declaration nodes
```

This means a Kotlin method can be a semantic child of a class in the model but
appear beside that class within the same directory compound in the diagram.
Kotlin-only directory chains with one child and no directly owned file are
compacted into a dotted namespace-style label. Visual containment should
therefore be read as artifact and source organization, not as declaration
ownership.

### Diagram scopes

Each diagram is a projection of the resolved declaration graph:

| Scope        | Included structure                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landscape    | Only relationships that cross module/package ownership, including visible unresolved external targets. Intra-package relationships are omitted.                                         |
| Package      | All declarations owned by the selected runtime module/package plus declarations or external nodes directly connected to them. Unrelated and merely transitive declarations are omitted. |
| Module group | Declarations in modules matched by the configured presentation group, plus directly connected boundaries. Grouping does not merge module identities.                                    |
| Folder       | Declarations under an explicitly configured package-local folder. Direct relationships outside the folder become gray boundary nodes labelled with their owning package when known.     |

Source and external exclusions are applied before scope projection. External
dependencies can be represented by one shared label, by one node per referring
declaration, or on the landscape by importer-specific copies, according to the
collapse and split settings. These choices reduce or expose visual fan-in; they
do not change the underlying relationships.

## Reading the dependency matrix

Every diagram has a matrix built from the same scope graph. Rows are **sources**
and columns are **targets**. Therefore a marked cell at row A and column B means
"A depends on B," matching the arrow direction in the diagram.

Declaration labels use `source/path#Declaration`; a source-unit/module node uses
its source path without a declaration suffix. Folder color bands and thicker
folder/package separators make source organization visible while scrolling.
Row labels and column headers remain sticky.

Cells use these codes:

| Code  | Meaning                                                                                 |
| ----- | --------------------------------------------------------------------------------------- |
| `R`   | At least one reference relationship from the row declaration to the column declaration. |
| `I`   | At least one inheritance/implementation relationship.                                   |
| `R+I` | Both projected relationship types exist for that pair.                                  |
| Blank | No directed relationship for that pair.                                                 |

Hovering a cell shows the full source, target, and relationship meaning. The
gray diagonal marks self-comparison; it is not itself a dependency.

The summary metrics are:

- **Declarations:** matrix row/column count.
- **Dependencies:** relationship-type occurrences, so an `R+I` cell contributes
  two.
- **Density:** unique marked source-target pairs divided by the possible
  off-diagonal directed pairs.
- **Avg outbound:** dependency-type occurrences divided by the declaration
  count.
- **Max outbound / Max inbound:** largest number of marked target/source cells
  for one declaration.
- **Isolated:** declarations with neither an inbound nor outbound marked cell.
- **Cycle groups:** strongly connected groups containing more than one
  declaration.

The matrix page is primarily a dense reading surface. It supports scrolling,
dark mode, and navigation to other diagram/matrix pages; graph selection and
focus controls live on the diagram page.

## Navigating the viewer

The artifact root and desktop application open the landscape first. The left
navigation lists every generated scope and gives each one a **Diagram** and
**Matrix** link. The menu button collapses or restores that navigation rail.

### Find and focus

- Type in **Search nodes** to do a case-insensitive label search. Nonmatching
  nodes are hidden and matches are outlined.
- Select a declaration to fade unrelated content and inspect its direct
  relationships. The status bar reports direct inbound and outbound counts.
- Choose **Both**, **Inbound**, **Outbound**, or **None** to control which direct
  relationships participate in the focus. This is not a transitive traversal.
- Select a package or directory compound to work with that group. **Collapse**
  replaces it temporarily with a proxy node and summarized boundary edges;
  selecting the proxy and choosing **Expand** restores it.
- Use **External** to temporarily show or hide all external nodes, and **Hidden**
  to reveal intentionally hidden connections as faint dotted edges.

### Move through a large graph

- Drag the canvas to pan and use the mouse wheel to zoom around the pointer.
- Use **Fit** to bring the currently displayed graph into the viewport.
- Drag nodes to curate their positions. Positions are autosaved to the scope's
  `layout.json`; when **Snap** is active, dropped nodes align to the selected
  grid size.
- **Auto layout** lays out the whole graph when nothing is selected, or the
  selected group when one is selected. Rows, horizontal/vertical gaps, and the
  orientation control change the flow before the operation runs. The resulting
  positions are saved.

Saved layout contains only live leaf-node positions, matching visual parents,
and intentionally hidden relationship IDs. Atlas cleans stale state when graph
content changes. Group collapse, search, focus mode, and external visibility are
temporary viewer state rather than architecture configuration.

### Curate presentation and policy

Some actions persist beyond the browser session:

- Select an edge and choose **Hide** to save that relationship ID as an
  intentionally hidden connection in `layout.json`. **Hidden** can reveal it
  again without forgetting the choice.
- Select an external node and choose **Hide** to add an external exclusion to
  `atlas.config.json` and regenerate.
- Select a local declaration and choose **Hide** to add its source path to the
  configured source exclusions and regenerate.
- Open **Excluded** to inspect, add, or remove global source and external
  exclusions.
- On the landscape, select an external node and choose **Split** to toggle the
  configured landscape-wide per-importer external splitting mode, then
  regenerate.
- Select a local declaration and choose **Create Diagram** to add a folder scope
  for that declaration's containing folder, then regenerate.

Configuration actions are available only while the local Atlas artifact server
or desktop viewer is running. Because they edit policy-owned diagram settings,
they affect regenerated views. They still do not suppress validation rules.

### Theme and exports

Dark mode is stored in browser-local storage and is shared by diagram and matrix
pages. **Export Image** writes a PNG of the complete current graph beside its
scope artifacts. **Export All** visits every generated graph page and replaces
all scope PNG exports.

## What not to infer from a view

- A missing node may have been outside the selected scope, excluded by diagram
  policy, folded into a source-unit node, or unresolved—not necessarily unused.
- A gray external node is an unresolved target relative to the selected models,
  not proof that the code lives outside the repository.
- A package or directory box expresses artifact/source organization. It does
  not necessarily reproduce namespace or nested declaration ownership.
- A solid edge groups imports, references, calls, and other non-inheritance
  portable relationships in the current renderer. Inspect the module model when
  the precise portable kind matters.
- A hidden edge and a collapsed group are presentation decisions. Architecture
  policy is defined only by the configured rules.
- Atlas reports static direct relationships. It does not measure runtime call
  frequency, infer domain boundaries, or automatically decide which dependency
  directions are desirable.

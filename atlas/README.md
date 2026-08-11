# Atlas

Atlas is a toolkit for understanding and enforcing the architecture of a project.

It has two jobs:

- **Enforcement**: evaluate declared dependency rules against your source
  code and fail with actionable diagnostics when a package, layer, or module
  violates them.
- **Understanding**: generate interactive, type-aware architecture diagrams
  and dependency matrices, and present them in a local desktop viewer, so you can
  see package, API, folder, and declaration relationships instead of inferring
  them from imports.

Atlas is language-neutral at its core. Language-specific tools each produce a
portable module model for their ecosystem; `atlas-cli` then validates rules and
generates diagrams from those models regardless of which language produced
them.

## Key concepts

| Term         | Meaning                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace    | The root folder used as the Atlas working directory.                                                                                                 |
| Package      | An analyzable unit discovered from the workspace (an npm package, Gradle/Kotlin module, Ruby gem, or C# project target).                             |
| Module model | The portable, language-neutral description of one package's declarations and dependencies, produced by a language-specific Atlas generator.          |
| Manifest     | The workspace-level file that aggregates every package's module model for `atlas-cli`.                                                               |
| Diagram      | A rendered graph view and its matching data, matrix, persisted layout, and optional export.                                                          |
| Landscape    | The workspace-wide diagram of cross-package and external dependencies.                                                                               |
| Layout       | Persisted node positions and intentionally hidden connections for one diagram. Layout is presentation, not architecture policy.                      |
| Rule         | A declared architectural constraint (no cycles, forbidden imports, dependency direction, layering, etc.) evaluated during `validate` and `generate`. |

For a detailed explanation of the portable architecture model, TypeScript,
Kotlin, Ruby, and C# mappings, validation semantics, diagram and matrix notation, and viewer
controls, see [Understanding Atlas output](docs/understanding-atlas.md).

## Set up

1. Add an `atlas.config.json` at your workspace root (see
   [Configuring the build toolkit](#configuring-the-build-toolkit)).
2. Generate module models per package (`atlas-ts`, `atlas-kt`, `atlas-rb`,
   `atlas-cs`, or an ecosystem build integration).
3. Aggregate the models into a workspace manifest.
4. Run `atlas-cli` against that manifest to validate rules and generate
   diagrams. Optionally open the `atlas` desktop viewer.

### TypeScript project

1. Add the Atlas packages as dependencies (use `file:` links to this checkout
   if you're working from source).
2. Add `atlas.config.json` at the workspace root. Start from
   `examples/typescript/atlas.config.json`.
3. Add these scripts to `package.json`:

```json
{
  "scripts": {
    "architecture:models": "atlas-ts generate",
    "architecture:validate": "atlas-cli validate --manifest architecture/models/atlas-workspace.json",
    "architecture:generate": "atlas-cli generate --manifest architecture/models/atlas-workspace.json",
    "architecture:view": "atlas --config atlas.config.json --manifest architecture/models/atlas-workspace.json",
    "build": "tsc --noEmit && npm run architecture:models && npm run architecture:validate && npm run architecture:generate"
  }
}
```

### Kotlin project

1. Include the composite build in `settings.gradle.kts`:

```kotlin
 pluginManagement {
     includeBuild("../path/to/atlas/src/tools") // path to atlas/src/tools
 }
```

2. Apply the plugin in the root `build.gradle.kts`:

```kotlin
 plugins {
     id("dev.atlas.kotlin")
 }

 atlas {
     // cliExecutable = "atlas-cli"
     // viewerExecutable = "atlas"
     generateOnBuild = true
     sourceDirectories = mutableListOf("src/main/kotlin")
 }
```

3. Add `atlas.config.json` at the Gradle root, using
   `group:name:version` module identities. Start from
   `examples/kotlin/atlas.config.json`.

Skip the Gradle plugin if you'd rather script it yourself: call
`atlas-ts generate`, `atlas-kt generate`, or `atlas-rb generate` directly, then drive `atlas-cli`
from your own build steps.

### Ruby project

1. Add `starcruisestudios-atlas-rb` to the development group in your `Gemfile`
   and run `bundle install`.
2. Add `atlas.config.json`. Each configured package directory may contain one
   gemspec; a gemless workspace root is treated as one Ruby application.
3. Generate models and then drive the language-neutral CLI:

   ```sh
   bundle exec atlas-rb generate
   atlas-cli validate --manifest architecture/models/atlas-workspace.json
   atlas-cli generate --manifest architecture/models/atlas-workspace.json
   ```

Start from `examples/ruby/atlas.config.json`. Ruby generation requires Ruby 3.1
or newer and analyzes source without loading application or Rails classes.

### C# project

1. Install the `StarCruiseStudios.Atlas.Cs` .NET tool and reference the
   `StarCruiseStudios.Atlas.Cs.MSBuild` package from one orchestration project.
2. Add `atlas.config.json` at the solution root. C# module IDs use
   `<PackageId>@<TargetFramework>` so multi-target projects remain distinct.
3. Run `atlas-cs generate`, then validate and generate diagrams with
   `atlas-cli`. Importing the MSBuild package provides `AtlasGenerateModels`,
   `AtlasValidate`, `AtlasGenerate`, and `AtlasView`; set
   `AtlasGenerateOnBuild` to `true` only in the designated orchestration project.

See `examples/csharp` for a complete clean-architecture solution. Building its
architecture project also verifies the generated models, graphs, and layouts.

## Configuring the build toolkit

`atlas.config.json` is the single policy file shared by the generators,
`atlas-cli`, and the viewer. It is validated against the schema published at
`@starcruisestudios/atlas-cli/schema`. Top-level sections:

| Section     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery` | Selects which packages participate. `packageGlobs`/`excludePackageGlobs` find package roots, `defaultSourceRoots` sets the source directories scanned when a package doesn't override them, and `packages` lists per-package overrides (`match`, `classification`, `classes`, custom source roots).                                                                                                                                                                                                           |
| `artifacts` | Where generated output is written. `root` sets the artifact directory (for example `architecture`).                                                                                                                                                                                                                                                                                                                                                                                                           |
| `layout`    | Default deterministic layout for diagrams: `orientation` (`horizontal`/`vertical`), `rows`, `horizontalGap`, `verticalGap`.                                                                                                                                                                                                                                                                                                                                                                                   |
| `diagrams`  | Diagram composition and filtering: `moduleGroups` to cluster packages on the landscape diagram, `excludeSourceGlobs`/`excludeExternalDependencies` to hide noise, `collapseExternalDependencies`/`collapseExternalDependencyGlobs` to fold third-party packages into a single node, `splitExternalDependenciesByImporter`/`externalDependencyImporterSplits` to keep some shared dependencies separated by importer, plus per-`packages` and per-`folders` overrides of the same options for scoped diagrams. |
| `layers`    | Named architectural layers, each matched by `sourceGlobs` and/or `packageNames`, used as inputs to layering rules.                                                                                                                                                                                                                                                                                                                                                                                            |
| `rules`     | Declared architecture constraints evaluated by `validate`/`generate`. Each rule has an `id`, a `type` (`no-circular`, `no-runtime-to-support`, `dependency-direction`, `forbidden-import`, `forbidden-external`, etc.), and a `severity` (`error` fails the build; lower severities are reported without failing).                                                                                                                                                                                            |

Classifying a package as `runtime` includes it in runtime architecture
reports and rules; `support` packages (tests, build tooling, Atlas itself) are
excluded from those checks. `classes` are free-form labels (`core`, `domain`,
`adapter`, `delivery`, and so on) that rules can target with
`packageClasses`.

See `examples/typescript/atlas.config.json`, `examples/kotlin/atlas.config.json`,
`examples/ruby/atlas.config.json`, and `examples/csharp/atlas.config.json` for complete, working policy files,
including layered dependency-direction rules, forbidden-import rules that keep
the domain free of outer-layer and framework imports, and diagram grouping
and folding for large workspaces.

## Using the CLI tools

### `atlas-ts`

Generates one language-neutral module model per selected TypeScript package
and writes the workspace manifest. It does not validate architecture rules or
build diagrams; hand the manifest to `atlas-cli` for those steps.

```sh
atlas-ts generate
atlas-ts generate --workspace . --config atlas.config.json --output architecture
```

| Option               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `--workspace <path>` | Workspace root (absolute or relative to the invocation directory) |
| `--config <path>`    | Atlas configuration file path                                     |
| `--output <path>`    | Artifact output root override                                     |

### `atlas-kt`

Generates one portable Kotlin module model from source roots (and optional
KSP semantic fragments). Prefer the Gradle plugin for multi-module builds; use
the CLI directly when scripting a single artifact.

```sh
atlas-kt generate \
  --project-root . \
  --module-id group:name:1.0.0 \
  --display-name name \
  --version 1.0.0 \
  --category jvm \
  --source-root src/main/kotlin \
  --output build/atlas/models/name.atlas-module.json
```

| Option                       | Required         | Description                                                    |
| ---------------------------- | ---------------- | -------------------------------------------------------------- |
| `--project-root <path>`      | Yes              | Project directory used to normalize source paths               |
| `--module-id <id>`           | Yes              | Stable published artifact identity                             |
| `--display-name <name>`      | Yes              | Readable artifact name                                         |
| `--version <version>`        | Yes              | Published artifact version                                     |
| `--category <category>`      | Yes              | Portable artifact family label (for example `jvm`)             |
| `--source-root <path>`       | Yes (repeatable) | Kotlin source directory relative to `--project-root`           |
| `--semantic-fragment <path>` | No (repeatable)  | KSP `*.atlas-fragment.json` file that refines source semantics |
| `--output <path>`            | Yes              | Destination module-model JSON file                             |

### `atlas-rb`

Generates one portable module model per selected Ruby gem and writes the
workspace manifest. A gemless root application derives its identity from the
workspace directory unless identity flags override it.

```sh
bundle exec atlas-rb generate
bundle exec atlas-rb generate --workspace . --config atlas.config.json --output architecture
```

| Option                  | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `--workspace <path>`    | Ruby workspace root                                         |
| `--config <path>`       | Atlas configuration file path                               |
| `--output <path>`       | Artifact output root override                               |
| `--module-id <id>`      | Gemless root module ID override                             |
| `--display-name <name>` | Gemless root display-name override                          |
| `--version <version>`   | Gemless root version override (default `0.0.0`)             |
| `--category <category>` | Gemless root category override (default `ruby-application`) |
| `--verbose`             | Emit structured generator diagnostics                       |

Ruby source mapping includes modules, classes, methods, constructors,
constants, requires, inheritance, mixins, and safely resolvable constant uses.
Literal Rails associations, validators, callbacks, delegates, and routes add
relationships but do not synthesize framework-generated API declarations.

### `atlas-cs`

Generates one portable module model per selected C# project target and a shared
workspace manifest. Roslyn compiler symbols provide declarations and semantic
relationships, including source-generated documents.

```sh
atlas-cs generate
atlas-cs generate --workspace . --config atlas.config.json --solution MySolution.slnx --output architecture
```

| Option               | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `--workspace <path>` | Solution or project workspace root                                      |
| `--config <path>`    | Atlas configuration file path                                           |
| `--solution <path>`  | Explicit `.sln` or `.slnx`; otherwise Atlas discovers one automatically |
| `--output <path>`    | Artifact output root override                                           |
| `--verbose`          | Emit detailed structured generator diagnostics                          |

The generator supports SDK-style projects, solution and project discovery,
multi-target frameworks, cross-project relationships, and deterministic,
portable paths for physical and source-generated C# documents.

### `atlas-cli`

Validates portable Atlas models and generates diagram data. Global options
apply to every command:

| Option                | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `--workspace <path>`  | Workspace root, absolute or relative to the invocation directory |
| `--config <path>`     | Atlas configuration file path (defaults to `atlas.config.json`)  |
| `--manifest <path>`   | Federated workspace manifest produced by a language generator    |
| `--output <path>`     | Artifact output root override                                    |
| `--log-level <level>` | Diagnostic level: `trace`, `debug`, `info`, `warn`, or `error`   |

#### `atlas-cli validate`

Discovers packages from the config or manifest, evaluates declared
architecture rules, prints violations, and exits non-zero on error-severity
failures. Does not rewrite diagrams or layouts.

```sh
atlas-cli validate --manifest architecture/models/atlas-workspace.json
```

#### `atlas-cli generate`

Validates by default, then writes all configured diagram, matrix, layout, and
viewer artifacts under the artifact root.

```sh
atlas-cli generate --manifest architecture/models/atlas-workspace.json
atlas-cli generate --no-validate
```

| Option          | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `--no-validate` | Skip enforcement and regenerate artifacts despite rule errors |

#### `atlas-cli diagram <scope>`

Generates one diagram scope. Scope is `landscape`, `package:<name>`, or
`folder:<package>:<path>`.

```sh
atlas-cli diagram landscape
atlas-cli diagram package:@atlas-example/domain --no-validate
```

| Option          | Description                                 |
| --------------- | ------------------------------------------- |
| `--no-validate` | Skip enforcement for this scoped generation |

#### `atlas-cli layout <scope>`

Computes and persists deterministic layout for one diagram scope. Without
`--force`, nodes that already have valid saved positions stay fixed.

```sh
atlas-cli layout landscape --rows 6 --horizontal-gap 80 --vertical-gap 60
atlas-cli layout package:@atlas-example/domain --force --generate
```

| Option                        | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `--rows <count>`              | Maximum nodes per row (positive integer)                |
| `--horizontal-gap <gap>`      | Horizontal gap between nodes (non-negative number)      |
| `--vertical-gap <gap>`        | Vertical gap between nodes (non-negative number)        |
| `--orientation <orientation>` | `horizontal` or `vertical`                              |
| `--force`                     | Replace retained saved positions                        |
| `--generate`                  | Regenerate graph and viewer artifacts before laying out |

#### `atlas-cli clean`

Removes regenerable files under the artifact root. Requires explicit
confirmation.

```sh
atlas-cli clean --confirm
```

| Option      | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| `--confirm` | Required. Authorizes deletion of regenerable artifact-root children |

#### `atlas-cli generate-models`

Generates one language-neutral model per selected package and a workspace
manifest. Prefer `atlas-ts generate` for TypeScript workspaces; this command
is the shared implementation those tools invoke.

```sh
atlas-cli generate-models --workspace . --config atlas.config.json
```

#### `atlas-cli view`

Serves generated diagrams over a local HTTP server and persists viewer
changes. Prefer the Electron `atlas` app for the desktop viewer.

```sh
atlas-cli view --host 127.0.0.1 --port 4173 --open
```

| Option          | Description                                              |
| --------------- | -------------------------------------------------------- |
| `--host <host>` | Listener interface (default `127.0.0.1`)                 |
| `--port <port>` | TCP port; `0` selects an available port (default `4173`) |
| `--open`        | Open the viewer in the default browser                   |

### `atlas`

Opens generated diagrams in the Electron desktop application. By default the
command returns immediately after launching Electron; pass `--foreground` to
keep the terminal attached until the window closes.

```sh
atlas
atlas atlas.config.json --foreground
atlas --config atlas.config.json --manifest architecture/models/atlas-workspace.json
atlas view --workspace . --config atlas.config.json --manifest build/atlas/models/atlas-workspace.json
```

| Argument / option    | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `[configPath]`       | Positional path to `atlas.config.json` (defaults to `./atlas.config.json`) |
| `view`               | Optional legacy subcommand prefix; ignored aside from compatibility        |
| `--config <path>`    | Atlas configuration file path                                              |
| `--workspace <path>` | Workspace root override                                                    |
| `--output <path>`    | Artifact output root override                                              |
| `--manifest <path>`  | Federated workspace manifest path                                          |
| `--host <host>`      | Local artifact-host interface                                              |
| `--port <port>`      | Local artifact-host port (`0` for an available port)                       |
| `--foreground`       | Keep this process attached until the viewer closes                         |
| `-h`, `--help`       | Print launcher usage and exit                                              |

## Example integrations

### TypeScript example

```sh
cd examples/typescript
npm run build
```

The TypeScript build typechecks the packages, runs `atlas-ts generate`,
validates with `atlas-cli`, and writes diagrams under `architecture/`.

```sh
npm run demo               # run the demo app
npm run architecture:view  # open the generated diagrams in Electron
```

### Kotlin example

```sh
cd examples/kotlin
./gradlew build
```

The Gradle build generates models with `atlas-kt`, validates them through
`atlas-cli` on your `PATH`, and writes diagrams under `architecture/`.

```sh
./gradlew :app:run    # run the demo app
./gradlew atlasView   # open the generated diagrams in Electron
```

Gradle tasks registered by the plugin:

| Task                       | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `atlasGenerateModuleModel` | Generate this module's portable model via `atlas-kt`            |
| `atlasGenerateModels`      | Generate models for every selected module                       |
| `atlasGenerateManifest`    | Aggregate models into `build/atlas/models/atlas-workspace.json` |
| `atlasValidate`            | Run `atlas-cli validate` against the manifest                   |
| `atlasGenerate`            | Run `atlas-cli generate` against the manifest                   |
| `atlasView`                | Open diagrams in Electron via `atlas`                           |

When `generateOnBuild` is `true` (default), `build` depends on
`atlasGenerate`. Useful extension fields: `includeTests`, `includedTargets`,
`excludedTargets`, `artifactVariant`, `artifactCategory`,
`kspProcessorDependency`, `cliExecutable`, and `viewerExecutable`.

### Ruby example

```sh
cd examples/ruby
bundle install
bundle exec rake build
```

The Ruby build discovers three gemspec-backed modules, extracts Ruby and Rails
relationships with `atlas-rb`, validates the manifest, and writes diagrams
under `architecture/`. The build also verifies graph identifiers, edge
endpoints, layout coverage, Ruby source metadata, and the example's expected
cross-gem and route relationships.

```sh
bundle exec rake view  # build and open the generated diagrams in Electron
```

### C# example

```sh
dotnet build examples/csharp/Atlas.Example.slnx --configuration Release
dotnet build examples/csharp/build/Atlas.Example.Architecture.csproj --configuration Release
```

The ordinary solution build remains independent of Atlas. The second command
opts into the MSBuild targets, generates four compiler-backed module models,
validates the architecture, creates ten diagram scopes, and runs a verifier
over graph endpoints, layouts, source-generated documents, and representative
semantic relationships.

## Working on Atlas itself

Root scripts for building, testing, and verifying this repository:

| Script                             | Purpose                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `npm run build`                    | Build Node, Kotlin, Ruby, C#, and all examples                            |
| `npm run build:node`               | Build `atlas-cli`, `atlas`, and `atlas-ts`, then link their CLIs globally |
| `npm run link:node`                | Link `atlas-cli`, `atlas`, and `atlas-ts` binaries globally               |
| `npm run build:kotlin`             | Build the Kotlin toolchain and Gradle plugin                              |
| `npm run build:ruby`               | Build the Ruby generator gem                                              |
| `npm run build:csharp`             | Build the C# generator, MSBuild package, and tests                        |
| `npm run install:ruby`             | Install the generator and Ruby example bundles                            |
| `npm run build:examples`           | Build all integrated examples                                             |
| `npm run build:example:typescript` | Build only the TypeScript example                                         |
| `npm run build:example:kotlin`     | Build only the Kotlin example                                             |
| `npm run build:example:ruby`       | Build only the Ruby example                                               |
| `npm run build:example:csharp`     | Generate and verify the C# example diagrams                               |
| `npm run view:examples`            | Build and open all example architecture viewers                           |
| `npm run view:example:typescript`  | Build and open the TypeScript example architecture viewer                 |
| `npm run view:example:kotlin`      | Build and open the Kotlin example architecture viewer                     |
| `npm run view:example:ruby`        | Build and open the Ruby example architecture viewer                       |
| `npm run view:example:csharp`      | Build and open the C# example architecture viewer                         |
| `npm run test`                     | Run Node, Kotlin, Ruby, and C# tests                                      |
| `npm run test:node`                | Run tests in every Node workspace that defines them                       |
| `npm run test:kotlin`              | Run Kotlin toolchain tests through the Gradle wrapper                     |
| `npm run test:ruby`                | Run Ruby generator tests through Bundler                                  |
| `npm run test:csharp`              | Run C# generator and integration tests                                    |
| `npm run typecheck`                | Typecheck every Node workspace that defines the script                    |
| `npm run lint`                     | Lint every Node workspace that defines the script                         |
| `npm run format:check`             | Check formatting in every Node workspace that defines the script          |
| `npm run verify`                   | Build, typecheck, lint, format-check, and test                            |

See `CONTRIBUTING.md` for contribution guidelines and `AGENTS.md` for the
coding conventions enforced in this repository.

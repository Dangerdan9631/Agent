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
| Project      | The directory containing the single `atlas.config.yml` root and its explicitly referenced fragments and models.                                      |
| Module       | One native npm package, Gradle target, Ruby gem/application, or C# project target that independently generates a model.                              |
| Module model | The portable, language-neutral description of one module's declarations and dependencies, produced by its language-specific Atlas generator.         |
| Diagram      | A rendered graph view and its matching data, matrix, persisted layout, and optional export.                                                          |
| Landscape    | The first explicitly configured project diagram of cross-module and external dependencies.                                                           |
| Layout       | Persisted node positions and intentionally hidden connections for one diagram. Layout is presentation, not architecture policy.                      |
| Rule         | A declared architectural constraint (no cycles, forbidden imports, dependency direction, layering, etc.) evaluated during `validate` and `generate`. |

For a detailed explanation of the portable architecture model, TypeScript,
Kotlin, Ruby, and C# mappings, validation semantics, diagram and matrix notation, and viewer
controls, see [Understanding Atlas output](docs/understanding-atlas.md).

## Set up

1. Add an `atlas.config.yml` at your workspace root (see
   [Configuring the build toolkit](#configuring-the-build-toolkit)).
2. Generate module models per package (`atlas-ts`, `atlas-kt`, `atlas-rb`,
   `atlas-cs`, or an ecosystem build integration).
3. List each generated model explicitly in the root `modules` array.
4. Run `atlas-cli` against the root configuration to validate rules and generate
   diagrams. Optionally open the `atlas` desktop viewer.

### TypeScript project

1. Add the Atlas packages as dependencies (use `file:` links to this checkout
   if you're working from source).
2. Add `atlas.config.yml` at the workspace root. Start from
   `examples/typescript/atlas.config.yml`.
3. Add an `atlas` mapping to each analyzed package and invoke `atlas-ts-npm` from that package:

```json
{
  "scripts": {
    "architecture:model": "atlas-ts-npm",
    "architecture:validate": "atlas-cli validate --config atlas.config.yml",
    "architecture:generate": "atlas-cli generate --config atlas.config.yml",
    "architecture:view": "atlas --config atlas.config.yml",
    "build": "tsc --noEmit && npm run architecture:models && npm run architecture:validate && npm run architecture:generate"
  }
}
```

### Kotlin project

1. Include the composite build in `settings.gradle.kts`:

```kotlin
 pluginManagement {
     includeBuild("../path/to/atlas/src/tools/kt") // path to atlas/src/tools/kt
 }
```

2. Apply the plugin in each analyzed Gradle project and register exact target models:

```kotlin
 plugins {
     id("dev.atlas.kotlin")
 }

 atlas {
     rootDirectory.set(rootProject.layout.projectDirectory.dir("architecture"))
     // cliExecutable = "atlas-cli"
     // viewerExecutable = "atlas"
     models {
         create("jvm") {
             target.set("jvm")
             compilation.set("main")
         }
     }
 }
```

3. Add `atlas.config.yml` at the Gradle root, using
   `group:name:version` module identities. Start from
   `examples/kotlin/atlas.config.yml`.

Skip the Gradle plugin if you'd rather script it yourself: call
`atlas-ts generate`, `atlas-kt generate`, or `atlas-rb generate` directly, then drive `atlas-cli`
from your own build steps.

### Ruby project

1. Add the `starcruisestudios-atlas-rb-sdk`, `starcruisestudios-atlas-rb-cli`,
   and `starcruisestudios-atlas-rb-rake` gems, then run `bundle install`.
2. Configure each analyzed gem or application in its own Rakefile with
   `Atlas::Rake.configure`, including the shared `root_directory` and optional exact gemspec.
3. Generate each module model and then drive the language-neutral CLI:

   ```sh
   bundle exec rake atlas:generate_model
   atlas-cli validate --config atlas.config.yml
   atlas-cli generate --config atlas.config.yml
   ```

Start from `examples/ruby/atlas.config.yml`. Ruby generation requires Ruby 3.1
or newer and analyzes source without loading application or Rails classes.

### C# project

1. Install the `StarCruiseStudios.Atlas.Cs.Cli` .NET tool and import the
   `StarCruiseStudios.Atlas.Cs.MSBuild` package in each analyzed project.
2. Add `atlas.config.yml` at the solution root. C# module IDs use
   `<PackageId>@<TargetFramework>` so multi-target projects remain distinct.
3. Set `AtlasRootDirectory` to the shared Atlas artifact root. The import
   runs `AtlasGenerateModuleModel` for the current evaluated target; project
   validation and diagrams remain separate `atlas-cli` operations.

See `examples/csharp` for a complete two-module reading-list solution.

## Configuring the build toolkit

`atlas.config.yml` is the single project root consumed by `atlas-cli` and the
viewer. It uses `schemaVersion: 2` and `documentType: root`, may extend explicit
`*.atlas.base.yml` external-diagram defaults, owns project artifacts and project
diagrams under `project`, and lists every generated model in a non-empty ordered
`modules` array. A module entry is either an inline complete configuration or a
path to a complete `*.atlas.module.config.yml` fragment.

Every `modules[].model` path is relative to the artifact root's `model/`
directory. Native build integrations receive only the artifact root and derive
target-specific filenames inside that directory.

Atlas never discovers packages or model files. Layout and filters are
diagram-local; only external exclusion and collapse behavior is inheritable.
Root validation operates between loaded modules, while validation nested in a
module entry operates inside or outward from that module. Missing generated
models are warned and skipped, but invalid present models and a zero-model result
fail the command.

See `examples/typescript/atlas.config.yml`, `examples/kotlin/atlas.config.yml`,
`examples/ruby/atlas.config.yml`, and `examples/csharp/atlas.config.yml` for complete, working policy files,
including dependency-direction rules that keep each reusable library independent
from its executable and focused diagram policy for the two-module workspaces.

## Using the CLI tools

### `atlas-ts`

Generates one language-neutral module model for the current npm package. It
reads only that package's `name`, `version`, and closed `atlas` mapping.

```sh
atlas-ts generate
atlas-ts generate --package-root packages/lib
```

| Option                  | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `--package-root <path>` | Exact npm package root (defaults to the current directory) |
| `--tsconfig <path>`     | Package-relative tsconfig override                         |
| `--root <path>`         | Package-relative Atlas artifact root override              |

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
  --target-name name \
  --source-root src/main/kotlin \
  --root build/atlas
```

| Option                       | Required         | Description                                                   |
| ---------------------------- | ---------------- | ------------------------------------------------------------- |
| `--project-root <path>`      | Yes              | Project directory used to normalize source paths              |
| `--module-id <id>`           | Yes              | Stable published artifact identity                            |
| `--display-name <name>`      | Yes              | Readable artifact name                                        |
| `--version <version>`        | Yes              | Published artifact version                                    |
| `--category <category>`      | Yes              | Portable artifact family label (for example `jvm`)            |
| `--target-name <name>`       | Yes              | Filesystem-safe native build-target name                      |
| `--source-root <path>`       | Yes (repeatable) | Kotlin source directory relative to `--project-root`          |
| `--semantic-fragment <path>` | No (repeatable)  | KSP `*.atlas.fragment.yml` file that refines source semantics |
| `--root <path>`              | Yes              | Atlas artifact root containing the `model` directory          |

### `atlas-rb`

Generates one portable module model for an explicitly configured Ruby gem or
gemless application.

```sh
bundle exec atlas-rb generate
bundle exec atlas-rb generate --module-root . --output architecture --source-root lib
```

| Option                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `--module-root <path>`  | Exact gem or application root                  |
| `--output <path>`       | Required Atlas artifact root                   |
| `--gemspec-file <path>` | Exact optional gemspec; no search is performed |
| `--source-root <path>`  | Explicit source root (repeatable)              |
| `--route-file <path>`   | Explicit Rails route file (repeatable)         |
| `--verbose`             | Emit structured generator diagnostics          |

Ruby source mapping includes modules, classes, methods, constructors,
constants, requires, inheritance, mixins, and safely resolvable constant uses.
Literal Rails associations, validators, callbacks, delegates, and routes add
relationships but do not synthesize framework-generated API declarations.

### `atlas-cs`

Generates one portable module model for one exact evaluated C# project target.
Roslyn compiler symbols provide declarations and semantic relationships.

```sh
atlas-cs generate --project src/Lib.csproj --target-framework net8.0 --output architecture
```

| Option                     | Description                          |
| -------------------------- | ------------------------------------ |
| `--project <path>`         | Exact SDK-style C# project           |
| `--target-framework <tfm>` | Exact evaluated target framework     |
| `--output <path>`          | Shared Atlas artifact root           |
| `--verbose`                | Emit detailed structured diagnostics |

The MSBuild integration passes these exact evaluated values once for each built target.

### `atlas-cli`

Validates portable Atlas models and generates diagram data. Global options
apply to every command:

| Option                | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `--workspace <path>`  | Workspace root, absolute or relative to the invocation directory |
| `--config <path>`     | Atlas configuration file path (defaults to `atlas.config.yml`)   |
| `--output <path>`     | Artifact output root override                                    |
| `--log-level <level>` | Diagnostic level: `trace`, `debug`, `info`, `warn`, or `error`   |

#### `atlas-cli validate`

Loads only configured module models, evaluates declared
architecture rules, prints violations, and exits non-zero on error-severity
failures. Does not rewrite diagrams or layouts.

```sh
atlas-cli validate --config atlas.config.yml
```

#### `atlas-cli generate`

Validates by default, then writes all configured diagram, matrix, layout, and
viewer artifacts under the artifact root.

```sh
atlas-cli generate --config atlas.config.yml
atlas-cli generate --no-validate
```

| Option          | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `--no-validate` | Skip enforcement and regenerate artifacts despite rule errors |

#### `atlas-cli diagram <scope>`

Generates one explicitly configured diagram scope. The first project diagram is
`landscape`, additional project diagrams use `project:<id>`, and module diagrams
use `module:<encoded-module-id>:<diagram-id>`.

```sh
atlas-cli diagram landscape
atlas-cli diagram module:%40atlas-example%2Flib:api --no-validate
```

| Option          | Description                                 |
| --------------- | ------------------------------------------- |
| `--no-validate` | Skip enforcement for this scoped generation |

#### `atlas-cli layout <scope>`

Computes and persists deterministic layout for one diagram scope. Without
`--force`, nodes that already have valid saved positions stay fixed.

```sh
atlas-cli layout landscape --rows 6 --horizontal-gap 80 --vertical-gap 60
atlas-cli layout module:%40atlas-example%2Flib:api --force --generate
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
atlas atlas.config.yml --foreground
atlas --config atlas.config.yml
atlas view --workspace . --config atlas.config.yml
```

| Argument / option    | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `[configPath]`       | Positional path to `atlas.config.yml` (defaults to `./atlas.config.yml`) |
| `view`               | Optional legacy subcommand prefix; ignored aside from compatibility      |
| `--config <path>`    | Atlas configuration file path                                            |
| `--workspace <path>` | Workspace root override                                                  |
| `--output <path>`    | Artifact output root override                                            |
| `--host <host>`      | Local artifact-host interface                                            |
| `--port <port>`      | Local artifact-host port (`0` for an available port)                     |
| `--foreground`       | Keep this process attached until the viewer closes                       |
| `-h`, `--help`       | Print launcher usage and exit                                            |

## Example integrations

### TypeScript example

```sh
cd examples/typescript
npm run build
```

The TypeScript build typechecks the packages, runs `atlas-ts-npm` in each package,
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

The Gradle build generates each explicitly registered target model with `atlas-kt`.
Run `atlas-cli` from the project root to validate or render the composed project.

```sh
./gradlew :app:run    # run the demo app
atlas --config atlas.config.yml  # generate and open the configured diagrams
```

Each named model registers `atlasGenerate<Name>Model`. When its
`generateOnBuild` is `true` (the default), that task joins the owning project's
build and uses only the configured target, compilation, model file, and semantic fragments.

### Ruby example

```sh
cd examples/ruby
bundle install
bundle exec rake build
```

The Ruby build runs the reading-list application, invokes each gem's explicit
Rake model configuration, validates the composed root, and writes diagrams under
`architecture/`.

```sh
bundle exec rake atlas:view  # build and open the generated diagrams in Electron
```

### C# example

```sh
dotnet build examples/csharp/Atlas.Example.slnx --configuration Release
atlas-cli generate --config examples/csharp/atlas.config.yml
```

Each project build generates its target-specific compiler-backed YAML model.
The second command composes those explicit outputs and creates the configured diagrams.

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
| `npm run build:example:csharp`     | Generate and validate the C# example diagrams                             |
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

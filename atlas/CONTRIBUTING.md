## Repository layout

```text
.
├── .docs
├── examples
│   ├── kotlin
│   ├── csharp
│   ├── ruby
│   └── typescript
├── src
│   ├── atlas-cli
│   ├── atlas
│   └── tools
│       ├── atlas-ts
│       ├── atlas-kt
│       ├── atlas-kt-gradle
│       ├── atlas-cs
│       └── atlas-rb
├── package.json
├── AGENTS.md
└── README.md
```

## Prerequisites

- Node.js 22 or newer
- A JDK (required for the Kotlin toolchain and Kotlin example; Gradle is provided
  by each package's wrapper)
- Ruby 3.1 or newer with Bundler (required for `atlas-rb` and the Ruby example)
- .NET SDK 8 or newer (required for `atlas-cs` and the C# example)

## Getting started

### 1. Clone and enter the project

```sh
git clone https://github.com/Dangerdan9631/Agent.git
cd Agent/atlas
```

### 2. Install dependencies

```sh
npm install
npm run install:ruby
```

### 3. Build Atlas

Build the Node packages, Kotlin toolchain, Ruby and C# generators, and examples:

```sh
npm run build
```

Or build node, kotlin, and example packages separately:

```sh
npm run build:node
npm run build:kotlin
npm run build:ruby
npm run build:csharp
npm run build:examples
# npm run build:example:typescript
# npm run build:example:kotlin
# npm run build:example:ruby
# npm run build:example:csharp
```

Confirm the links:

```sh
atlas-cli --help
atlas-ts --help
(cd src/tools/atlas-rb && bundle exec atlas-rb generate --help)
dotnet run --project src/tools/atlas-cs/src/Atlas.Cs -- --help
atlas --help
```

`atlas --help` prints viewer usage and exits. By default `atlas` launches Electron
and returns immediately; pass `--foreground` to keep the terminal attached until
you close the app.

### 4. Build and run the examples

To build and run the example architecture viewers:

```sh
npm run build:examples
npm run view:examples

# npm run build:example:typescript
# npm run view:example:typescript
# npm run build:example:kotlin
# npm run view:example:kotlin
# npm run build:example:ruby
# npm run view:example:ruby
# npm run build:example:csharp
# npm run view:example:csharp
```

#### TypeScript

From the example workspace:

```sh
cd examples/typescript
npm run build
```

The TypeScript build typechecks the packages, runs `atlas-ts generate`, validates
with `atlas-cli`, and writes diagrams under `architecture/`.

Run the demo app:

```sh
npm run demo
```

Open the generated diagrams in Electron:

```sh
npm run architecture:view
```

#### Kotlin

From the example workspace:

```sh
cd examples/kotlin
./gradlew build
```

The Gradle build generates models with `atlas-kt`, validates them through `atlas-cli` on your `PATH`, and writes diagrams under `architecture/`.

Run the demo app:

```sh
./gradlew :app:run
```

Open the generated diagrams in Electron:

```sh
./gradlew atlasView
```

#### Ruby

From the Ruby example workspace:

```sh
cd examples/ruby
bundle exec rake build
```

The build discovers gemspec-backed modules, runs `atlas-rb generate`, validates
with the shared CLI, writes diagrams under `architecture/`, and checks graph,
layout, Ruby metadata, and expected semantic-edge integrity.

```sh
bundle exec rake view
```

#### C#

The C# solution has an ordinary application build and a designated Atlas
orchestration project:

```sh
dotnet build examples/csharp/Atlas.Example.slnx --configuration Release
dotnet build examples/csharp/build/Atlas.Example.Architecture.csproj --configuration Release
```

The orchestration build uses the opt-in MSBuild targets to generate compiler-backed
models, validate policy, create diagrams, and verify the persisted graph and layout data.

## Commands

Root scripts:

| Script                             | Purpose                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `npm run build`                    | Build Node, Kotlin, Ruby, C#, and all examples                            |
| `npm run build:node`               | Build `atlas-cli`, `atlas`, and `atlas-ts`, then link their CLIs globally |
| `npm run link:node`                | Link `atlas-cli`, `atlas`, and `atlas-ts` binaries globally               |
| `npm run build:kotlin`             | Build the Kotlin toolchain and Gradle plugin                              |
| `npm run build:ruby`               | Build the Ruby generator gem                                              |
| `npm run build:csharp`             | Build the C# generator, MSBuild package, and tests                        |
| `npm run install:ruby`             | Install the Ruby generator and example bundles                            |
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

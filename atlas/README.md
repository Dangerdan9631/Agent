# Atlas

Atlas validates language-neutral architecture models and presents their generated
diagrams in a local Electron desktop application.

## Repository layout

```text
.
├── .docs
├── examples
│   ├── kotlin
│   └── typescript
├── src
│   ├── atlas-cli
│   ├── atlas
│   └── tools
│       ├── atlas-ts
│       ├── atlas-kt
│       └── atlas-kt-gradle
├── package.json
├── AGENTS.md
└── README.md
```

## Prerequisites

- Node.js 22 or newer
- A JDK with Gradle support (required for the Kotlin toolchain and Kotlin example)

## Getting started

These steps assume a fresh clone and put the Atlas CLIs on your `PATH` so both
examples can invoke them locally.

### 1. Clone and enter the project

```sh
git clone https://github.com/Dangerdan9631/Agent.git
cd Agent/atlas
```

### 2. Install dependencies

```sh
npm install
```

### 3. Build Atlas

Build the Node packages (`atlas-cli`, `atlas`, `atlas-ts`) and the Kotlin
toolchain (`atlas-kt`, Gradle plugin):

```sh
npm run build:node
npm run build:kotlin
```

Or build everything, including both examples, in one step:

```sh
npm run build
```

### 4. Link the CLIs locally

After a successful build, register the package binaries globally so `atlas`,
`atlas-cli`, and `atlas-ts` resolve from any directory (including Gradle tasks
in the Kotlin example):

```sh
npm link --workspace=@starcruisestudios/atlas-cli
npm link --workspace=@starcruisestudios/atlas
npm link --workspace=@starcruisestudios/atlas-ts
```

Confirm the links:

```sh
atlas-cli --help
atlas-ts --help
atlas --help
```

`atlas --help` prints viewer usage and exits. By default `atlas` launches
Electron and returns immediately; pass `--foreground` to keep the terminal
attached until you close the app.

### 5. Build and run the examples

#### TypeScript

From the repository root:

```sh
npm run build:example:typescript
```

Or from the example workspace:

```sh
cd examples/typescript
npm run build
```

The TypeScript build typechecks the packages, runs `atlas-ts generate`, validates
with `atlas-cli`, and writes diagrams under `architecture/`.

Run the demo app:

```sh
cd examples/typescript
npm run demo
```

Open the generated diagrams in Electron:

```sh
cd examples/typescript
npm run architecture:view
```

#### Kotlin

From the repository root:

```sh
npm run build:example:kotlin
```

The Gradle build generates models with `atlas-kt`, validates them through
`atlas-cli` on your `PATH`, and writes diagrams under `architecture/`.

Run the demo app:

```sh
node ./src/tools/atlas-kt-gradle/scripts/RunGradle.mjs --project examples/kotlin :app:run
```

Open the generated diagrams in Electron:

```sh
node ./src/tools/atlas-kt-gradle/scripts/RunGradle.mjs --project examples/kotlin atlasView
```

## Commands

Root scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Build Node packages, Kotlin toolchain, and both examples |
| `npm run build:node` | Build `atlas-cli`, `atlas`, and `atlas-ts` |
| `npm run build:kotlin` | Build the Kotlin toolchain and Gradle plugin |
| `npm run build:examples` | Build both integrated examples |
| `npm run build:example:typescript` | Build only the TypeScript example |
| `npm run build:example:kotlin` | Build only the Kotlin example |
| `npm run verify` | Typecheck, lint, format check, test, and build |

CLI tools (available after `npm link`):

- `atlas-ts generate` generates TypeScript module models and a workspace manifest.
- `atlas-kt generate` generates one Kotlin module model from source roots.
- `atlas-cli validate` validates a generated model workspace.
- `atlas-cli generate` validates and generates diagram data.
- `atlas` opens the generated graph selected by `atlas.config.json` in Electron.

Both examples contain `app` and `library` packages. Their normal builds
generate models, validate architecture, and generate diagrams.

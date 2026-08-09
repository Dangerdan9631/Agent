
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
- A JDK (required for the Kotlin toolchain and Kotlin example; Gradle is provided
  by each package's wrapper)

## Getting started

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

Build the Node packages (`atlas-cli`, `atlas`, `atlas-ts`) and the Kotlin toolchain
(`atlas-kt`, Gradle plugin):
```sh
npm run build
```

Or build node, kotlin, and example packages separately:

```sh
npm run build:node
npm run build:kotlin
npm run build:examples
# npm run build:example:typescript
# npm run build:example:kotlin
```

Confirm the links:

```sh
atlas-cli --help
atlas-ts --help
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

## Commands

Root scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Build Node packages, Kotlin toolchain, and both examples |
| `npm run build:node` | Build `atlas-cli`, `atlas`, and `atlas-ts`, then link their CLIs globally |
| `npm run link:node` | Link `atlas-cli`, `atlas`, and `atlas-ts` binaries globally |
| `npm run build:kotlin` | Build the Kotlin toolchain and Gradle plugin |
| `npm run build:examples` | Build both integrated examples |
| `npm run build:example:typescript` | Build only the TypeScript example |
| `npm run build:example:kotlin` | Build only the Kotlin example |
| `npm run view:examples` | Build and open both example architecture viewers |
| `npm run view:example:typescript` | Build and open the TypeScript example architecture viewer |
| `npm run view:example:kotlin` | Build and open the Kotlin example architecture viewer |
| `npm run test` | Run Node workspace tests and Kotlin toolchain tests |
| `npm run test:node` | Run tests in every Node workspace that defines them |
| `npm run test:kotlin` | Run Kotlin toolchain tests through the Gradle wrapper |
| `npm run typecheck` | Typecheck every Node workspace that defines the script |
| `npm run lint` | Lint every Node workspace that defines the script |
| `npm run format:check` | Check formatting in every Node workspace that defines the script |
| `npm run verify` | Build, typecheck, lint, format-check, and test |

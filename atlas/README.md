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

## Commands

Install dependencies once from the repository root:

```sh
npm install
```

Build the full toolchain and both integrated examples:

```sh
npm run build
npm run verify
```

The dedicated commands are:

- `atlas-ts generate` generates TypeScript module models and a workspace manifest.
- `atlas-kt generate` generates one Kotlin module model from source roots.
- `atlas-cli validate` validates a generated model workspace.
- `atlas-cli generate` validates and generates diagram data.
- `atlas` opens the generated graph selected by `atlas.config.json` in Electron.

Both examples contain `app` and `library` packages. Their normal builds
generate models, validate architecture, and generate diagrams. Use
`npm run build:example:typescript` or `npm run build:example:kotlin` to run one
independently.

# Atlas

Atlas is a development-time architecture observatory for TypeScript projects. Add it to a workspace to validate dependency rules, generate navigable architecture diagrams, and preserve diagram layouts locally.

Atlas analyzes only the packages you explicitly configure. It does not alter application source code.

## Requirements

- Node.js 22 or newer
- A TypeScript project with one or more `package.json` files

## Install Atlas

Atlas is currently distributed from a local checkout rather than a public package registry. Build and link it once, then link it into the project you want to analyse:

```sh
# In the Atlas checkout
npm ci
npm run build
npm link

# In the TypeScript project to analyse
npm link @starcruisestudios/atlas
```

When Atlas changes, run `npm run build` again in the Atlas checkout. The linked project will use the rebuilt command without reinstalling it.

Once Atlas is available in your package registry, install it as a development dependency instead:

```sh
npm install --save-dev @starcruisestudios/atlas
```

Run it with `npx atlas` (or add `atlas` scripts to your `package.json`).

## Configure your project

Create `atlas.config.json` at the root of the project you want Atlas to inspect. Every package Atlas includes needs an explicit policy and classification:

```json
{
  "$schema": "./node_modules/@starcruisestudios/atlas/dist/config/atlas.schema.json",
  "schemaVersion": 1,
  "discovery": {
    "packageGlobs": ["apps/*", "packages/*"],
    "excludePackageGlobs": ["**/node_modules/**", "**/dist/**"],
    "defaultSourceRoots": ["src"],
    "packages": [
      {
        "match": { "path": "apps/web" },
        "classification": "runtime",
        "classes": ["frontend"],
        "tsconfig": "tsconfig.json"
      },
      {
        "match": { "path": "packages/domain" },
        "classification": "runtime",
        "classes": ["domain"]
      },
      {
        "match": { "path": "packages/test-support" },
        "classification": "support"
      }
    ]
  },
  "artifacts": {
    "root": "architecture"
  },
  "layout": {
    "orientation": "horizontal",
    "rows": 6,
    "horizontalGap": 80,
    "verticalGap": 60
  },
  "diagrams": {
    "excludeSourceGlobs": ["**/*.test.ts", "**/*.spec.ts"],
    "excludeExternalDependencies": ["@types/*"],
    "collapseExternalDependencies": true,
    "splitExternalDependenciesByImporter": false,
    "folders": [
      {
        "packageName": "@your-org/domain",
        "path": "src/orders",
        "title": "Orders domain"
      }
    ]
  },
  "layers": [
    {
      "name": "ui",
      "sourceGlobs": ["apps/web/src/**"],
      "packageNames": ["@your-org/web"]
    },
    {
      "name": "domain",
      "sourceGlobs": ["packages/domain/src/**"],
      "packageNames": ["@your-org/domain"]
    }
  ],
  "rules": [
    {
      "id": "no-cycles",
      "type": "no-circular",
      "severity": "error"
    },
    {
      "id": "ui-may-not-import-domain-internals",
      "type": "forbidden-import",
      "severity": "error",
      "from": { "layers": ["ui"] },
      "patterns": ["@your-org/domain/src/**"]
    },
    {
      "id": "domain-may-not-depend-on-ui",
      "type": "dependency-direction",
      "severity": "error",
      "mode": "forbid",
      "from": { "layers": ["domain"] },
      "to": { "layers": ["ui"] }
    }
  ]
}
```

Use package names in `packageName` fields and rule selectors; use project-relative paths in `match.path`, `sourceRoots`, and glob patterns. Atlas uses slash-separated paths on every operating system.

If the project has only one package at its root, omit `packageGlobs` and match its manifest name instead:

```json
{
  "schemaVersion": 1,
  "discovery": {
    "packages": [
      {
        "match": { "name": "my-app" },
        "classification": "runtime",
        "sourceRoots": ["src"]
      }
    ]
  }
}
```

The complete JSON Schema ships with the package at `@starcruisestudios/atlas/schema`.

## Use Atlas

From the target project root:

```sh
# Check architecture rules. Error-severity violations exit with code 1.
npx atlas validate

# Validate, then generate every configured diagram and report.
npx atlas generate

# Open the generated diagrams locally at http://127.0.0.1:4173.
npx atlas view --open
```

Add these scripts to run Atlas consistently in local development and CI:

```json
{
  "scripts": {
    "architecture:validate": "atlas validate",
    "architecture:generate": "atlas generate",
    "architecture:view": "atlas view --open"
  }
}
```

`atlas generate` validates first. Use `--no-validate` only when you intentionally need artifacts despite error-severity violations.

### Command reference

| Command                                               | Purpose                                                                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `atlas validate`                                      | Evaluates configured architecture rules.                                                                                                       |
| `atlas generate [--no-validate]`                      | Produces all configured diagrams and dependency-analysis artifacts.                                                                            |
| `atlas diagram <scope> [--no-validate]`               | Regenerates one scope: `landscape`, `package:<package-name>`, or `folder:<package-name>:<path>`.                                               |
| `atlas layout <scope>`                                | Writes deterministic positions for an existing diagram. Use `--generate` to regenerate first, and `--force` to replace saved manual positions. |
| `atlas view [--host <host>] [--port <port>] [--open]` | Serves generated artifacts; defaults to `127.0.0.1:4173`.                                                                                      |
| `atlas clean --confirm`                               | Removes generated contents from the artifact root.                                                                                             |

All commands accept `--workspace <path>`, `--config <path>`, and `--output <path>`. This lets a central script target a nested app or write artifacts outside the repository, for example:

```sh
npx atlas --workspace apps/web --config apps/web/atlas.config.json --output .atlas-output generate
```

## Read and share the results

By default Atlas writes to `architecture/`; set `artifacts.root` or pass `--output` to change that location. The generated root contains a landing page and navigation, while each scope contains:

- `index.html` — interactive diagram with search, filtering, grouping, drag-to-position, grid snapping, automatic layout, and PNG export.
- `matrix.html` — dependency matrix for the same scope.
- `graph.json` — the graph data for integrations or review tooling.
- `layout.json` — saved node positions and layout state.

The root also includes dependency analysis under `analysis/`. Treat the whole artifact root as generated output: commit it when it is useful for architecture review, or add it to `.gitignore` when it is only a local exploration aid.

## Integrate it into your workflow

Run validation in CI before test or release stages:

```yaml
- run: npm ci
- run: npm run architecture:validate
```

Generate diagrams in a documentation or review workflow:

```sh
npm run architecture:generate
# Publish or archive the configured architecture/ directory.
```

To evolve an existing project safely, start with `no-circular` as an error and add direction or forbidden-import rules after you have named the boundaries you want to preserve. Use `warning` severity while introducing a rule, then change it to `error` once the current violations are resolved.

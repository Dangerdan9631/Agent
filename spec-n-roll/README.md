# Spec N' Roll

> Rock out with your docs out

Spec-N-Roll is a toolkit for AI spec-driven development workflows. It helps
teams and agents define work with task-focused specifications, preserve those
task specs as an immutable implementation record, and maintain a living
application specification that is enforced through deterministic validation.

## What It Does

Spec-N-Roll is intended to support the full loop of AI-assisted specification
work:

- **Generate implementation plans** - Create task-focused specifications that
  define bounded units of work.
- **Clearly document application specifications** - Maintain living
  specifications for the full functionality of the application.
- **Coordinate agent work** - Give AI agents structured task context, project
  goals, and durable decisions to work from.
- **Validate functionality** - Execute and validate the living application
  specification through deterministic validation workflows.
- **Document and maintain architecture** - Keep architecture expectations
  visible through generated dependency diagrams and tests.
- **Preserve implementation history** - Treat task-focused specifications as an
  immutable record of decisions and implementation details.

## Package Map

| Package               | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `spec-n-roll`         | Public dispatcher executable exposed as `spec-n-roll` and `snr`.             |
| `spec-n-roll-runtime` | Child-process runtime that receives dispatcher invocation.                   |
| `spec-n-roll-api`     | Shared contracts for dispatcher/runtime boundaries and project metadata.     |
| `spec-n-roll-sdk`     | Transport-independent application behavior shared by executable surfaces.    |
| `spec-n-roll-mcp`     | MCP executable surface for Spec-N-Roll behavior.                             |
| `spec-n-roll-arch`    | Architecture validation, dependency diagram generation, and diagram viewing. |
| `spec-n-roll-test`    | Reusable test helpers, fixtures, and executable test workflows.              |

## Quick Start

Install dependencies with Node.js 22 or newer:

```sh
npm install
```

Build every workspace package:

```sh
npm run build
```

Run the full unit test suite:

```sh
npm test
```

Run the dispatcher locally after building:

```sh
npx spec-n-roll --root . example-command
```

The current runtime is a stub implementation. It prints the dispatcher
invocation payload that it receives, including the forwarded arguments, selected
working directory, optional project root, and dispatcher install metadata.

## Development

### Dispatcher

The public CLI is owned by the `spec-n-roll` package and is available through
either executable name:

```sh
npx spec-n-roll [options] [...runtime-args]
npx snr [options] [...runtime-args]
```

Dispatcher options:

| Option          | Description                                                               |
| --------------- | ------------------------------------------------------------------------- |
| `--root <path>` | Uses the supplied project root when resolving runtime context.            |
| `--global`      | Forces the globally installed runtime instead of a project-local runtime. |
| `--version`     | Prints the dispatcher version.                                            |
| `--help`        | Prints dispatcher help.                                                   |

Additional arguments are preserved and forwarded to the runtime. This lets the
dispatcher remain focused on routing while runtime packages own command behavior.

### Runtime Selection

The dispatcher resolves the project root from `--root` or the current working
directory, then selects a runtime target:

1. Project-local runtime when a project root is found and `--global` is not set.
2. Globally installed runtime when `--global` is set or no project-local runtime
   is available.

The runtime receives a JSON invocation containing:

| Field         | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `argv`        | CLI arguments supplied to the dispatcher after the executable path. |
| `dispatcher`  | Dispatcher package and install-source metadata.                     |
| `projectRoot` | Absolute project root when one was resolved.                        |
| `cwd`         | Absolute working directory selected for runtime execution.          |

### MCP Surface

The `spec-n-roll-mcp` package owns the MCP process entry point:

```sh
npm run build --workspace spec-n-roll-mcp
npm exec --workspace spec-n-roll-mcp spec-n-roll-mcp
```

Shared behavior should live in `spec-n-roll-sdk` when it is needed by both
runtime and MCP surfaces.

### Common Commands

| Command                                     | Description                                             |
| ------------------------------------------- | ------------------------------------------------------- |
| `npm run build`                             | Builds all workspace packages in dependency order.      |
| `npm run lint`                              | Runs ESLint and Prettier checks.                        |
| `npm run lint:fix`                          | Applies ESLint fixes and Prettier formatting.           |
| `npm test`                                  | Runs Vitest across the workspace.                       |
| `npm run test:cucumber`                     | Runs Cucumber feature tests from `spec-n-roll-test`.    |
| `npm run arch`                              | Generates architecture dependency artifacts.            |
| `npm run view --workspace spec-n-roll-arch` | Serves generated diagrams and autosaves layout changes. |

Package-specific scripts can be run with npm workspace targeting:

```sh
npm run test --workspace spec-n-roll-runtime
npm run build --workspace spec-n-roll-arch
```

### Architecture Diagrams

Architecture artifacts are generated by `spec-n-roll-arch`:

```sh
npm run build
npm run arch
```

The generated files are written under:

```text
architecture/
```

Important generated views include:

| Artifact                            | Description                                        |
| ----------------------------------- | -------------------------------------------------- |
| `landscape.cytoscape.html`          | Workspace package dependency graph.                |
| `<package>/cytoscape.html`          | Package-level source dependency graph.             |
| `<package>/dependency-cruiser.json` | Raw dependency-cruiser report for the package.     |
| `<package>/cytoscape.json`          | Cytoscape JSON data for the package graph.         |
| `<package>/folder-*.cytoscape.html` | Optional configured folder-level diagrams.         |
| `*.cytoscape.layout.json`           | Checked-in node and group positions for a diagram. |

Inspect diagrams through the local architecture viewer after generating them:

```sh
npm run view --workspace spec-n-roll-arch
```

The viewer serves the generated pages, includes navigation between graph pages,
and owns the write boundary for automatic layout persistence. Opening the HTML
files directly still shows a graph, but layout changes cannot be written back to
repository files from a static `file://` page.

### Configuring Architecture Diagrams

Architecture diagram configuration lives in:

```text
spec-n-roll.architecture.config.cjs
```

Use it to:

| Setting                                | Purpose                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `collapsed.externalDependencies`       | Collapse selected external modules into one dependency node.                                |
| `split.landscape.externalDependencies` | Give configured workspace-package imports separate external nodes in the landscape diagram. |
| `exclusions.landscape`                 | Hide selected external modules from the landscape diagram.                                  |
| `exclusions.projectFiles.allPackages`  | Hide matching project files from every package diagram.                                     |
| `exclusions.projectFiles.packages`     | Hide matching files for specific packages.                                                  |
| `folderDiagrams.packages`              | Opt packages into additional folder-scoped diagrams.                                        |

For example, this creates separate `commander` nodes for the listed workspace
packages in the landscape diagram. Each import points to its package-specific
node; packages omitted from the list continue to use the shared node.

```js
split: {
  landscape: {
    externalDependencies: {
      commander: ['spec-n-roll', 'spec-n-roll-mcp', 'spec-n-roll-runtime'],
    },
  },
},
```

Folder diagrams are configured per package. Paths are relative to the package
root:

```js
module.exports = {
  folderDiagrams: {
    packages: {
      'spec-n-roll': [
        {
          title: 'Dispatcher application',
          path: 'src/application',
        },
      ],
    },
  },
};
```

After changing the configuration, run `npm run arch` again and refresh the
viewer.

### Diagram Layout Flow

Diagram layout is persisted automatically by the local architecture viewer:

1. Generate diagram artifacts with `npm run arch`.
2. Start the viewer with `npm run view --workspace spec-n-roll-arch`.
3. Move nodes and groups into the desired positions.
4. Let the viewer autosave the layout beside the diagram as `*.layout.json`.
5. Commit the changed layout file with the generated diagram artifacts.

Layout files are checked into the repository so every development environment
opens diagrams with the same positions. Updating a layout does not require
running `npm run arch`; refresh the served page or switch diagrams in the viewer
to see the current checked-in layout. Regenerate diagrams only when the graph
structure or architecture configuration changes.

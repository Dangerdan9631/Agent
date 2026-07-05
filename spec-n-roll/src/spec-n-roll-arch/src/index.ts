#!/usr/bin/env node
import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from 'commander';
import { container, type DependencyContainer } from 'tsyringe';
import { Logger } from 'tslog';

/**
 * Describes a workspace package discovered from the source package roots.
 */
export interface WorkspacePackage {
  /**
   * Package name from package.json. The value must be a non-empty npm package name.
   */
  name: string;

  /**
   * Absolute filesystem path to the package root.
   */
  root: string;

  /**
   * Runtime and development package dependencies keyed by package name.
   */
  dependencies: Record<string, string>;
}

/**
 * Describes a Cytoscape node or edge element.
 */
export interface CytoscapeElement {
  /**
   * Cytoscape element payload. Nodes require an id and edges require source and target.
   */
  data: Record<string, string>;
}

/**
 * Runs the executable behavior after commander has parsed process arguments.
 */
interface CommandRunner {
  /**
   * Executes the command action and writes any user-facing output.
   */
  run(): void;
}

/**
 * Identifies packages that support development workflows rather than runtime
 * application behavior.
 */
const excludedPackageNames = new Set(['spec-n-roll-arch', 'spec-n-roll-test']);

/**
 * Emits diagnostic messages for architecture generation.
 */
const logger = new Logger({ name: 'spec-n-roll-arch', minLevel: 6 });

/**
 * Identifies the command runner registration in the executable dependency container.
 */
const commandRunnerToken = 'spec-n-roll-arch.commandRunner';

/**
 * Finds the repository root by walking upward from this package.
 *
 * @returns The absolute path to the repository root.
 */
export function findWorkspaceRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
}

/**
 * Reads package metadata for workspace packages that participate in runtime architecture.
 *
 * @param workspaceRoot - Absolute path to the repository root.
 * @returns Runtime workspace packages, excluding architecture and test support packages.
 */
export function discoverRuntimePackages(
  workspaceRoot: string,
): WorkspacePackage[] {
  const sourceRoot = join(workspaceRoot, 'src');
  return readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readWorkspacePackage(join(sourceRoot, entry.name)))
    .filter(
      (workspacePackage) => !excludedPackageNames.has(workspacePackage.name),
    );
}

/**
 * Generates dependency-cruiser and Cytoscape artifacts for each runtime package and the project graph.
 *
 * @param workspaceRoot - Absolute path to the repository root.
 * @returns Absolute paths to generated artifact files.
 */
export function generateArchitectureArtifacts(
  workspaceRoot = findWorkspaceRoot(),
): string[] {
  const packages = discoverRuntimePackages(workspaceRoot);
  const outputRoot = join(
    workspaceRoot,
    'src',
    'spec-n-roll-arch',
    'architecture',
  );
  mkdirSync(outputRoot, { recursive: true });

  const generatedFiles = [
    ...packages.flatMap((workspacePackage) =>
      generatePackageArtifacts(workspaceRoot, outputRoot, workspacePackage),
    ),
    ...generateProjectArtifacts(outputRoot, packages),
  ];

  for (const generatedFile of generatedFiles) {
    console.log(chalk.green(relative(workspaceRoot, generatedFile)));
  }

  return generatedFiles;
}

/**
 * Creates a dependency container for one architecture command invocation.
 *
 * @returns A child dependency container with command execution services registered.
 */
function createCommandContainer(): DependencyContainer {
  const commandContainer = container.createChildContainer();
  commandContainer.registerInstance<CommandRunner>(commandRunnerToken, {
    run() {
      logger.debug('Generating architecture artifacts.');
      main();
    },
  });

  return commandContainer;
}

/**
 * Creates the architecture command line program.
 *
 * @returns A commander program configured for architecture artifact generation.
 */
export function createProgram(): Command {
  return new Command()
    .name('spec-n-roll-arch')
    .description('Generates spec-n-roll architecture dependency artifacts.')
    .version('0.1.0')
    .action(() => {
      createCommandContainer().resolve<CommandRunner>(commandRunnerToken).run();
    });
}

/**
 * Runs the architecture executable workflow.
 *
 * @returns Absolute paths to generated artifact files.
 */
export function main(): string[] {
  return generateArchitectureArtifacts();
}

/**
 * Runs the architecture command line interface.
 *
 * @param argv - Process argument vector including the executable and script path.
 */
export function runCli(argv: readonly string[] = process.argv): void {
  createProgram().parse([...argv]);
}

/**
 * Checks whether this module is being run as the process entry point.
 *
 * @returns true when this module path matches the current process script path.
 */
function isMainModule(): boolean {
  return (
    realpathSync(fileURLToPath(import.meta.url)) ===
    realpathSync(resolve(process.argv[1] ?? ''))
  );
}

if (isMainModule()) {
  runCli();
}

/**
 * Reads a workspace package manifest and normalizes dependency metadata.
 *
 * @param packageRoot - Absolute path to a workspace package root.
 * @returns Workspace package metadata used by architecture generation.
 */
function readWorkspacePackage(packageRoot: string): WorkspacePackage {
  const packageJson = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  ) as {
    name: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  return {
    name: packageJson.name,
    root: packageRoot,
    dependencies: {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    },
  };
}

/**
 * Generates dependency-cruiser and Cytoscape artifacts for one package.
 *
 * @param workspaceRoot - Absolute path to the repository root.
 * @param outputRoot - Absolute path to the architecture output directory.
 * @param workspacePackage - Package metadata for the source package to inspect.
 * @returns Absolute paths to the generated package artifacts.
 */
function generatePackageArtifacts(
  workspaceRoot: string,
  outputRoot: string,
  workspacePackage: WorkspacePackage,
): string[] {
  const packageOutputRoot = join(outputRoot, workspacePackage.name);
  mkdirSync(packageOutputRoot, { recursive: true });
  const dependencyCruiserJsonPath = join(
    packageOutputRoot,
    'dependency-cruiser.json',
  );
  const cytoscapeJsonPath = join(packageOutputRoot, 'cytoscape.json');
  const cytoscapeHtmlPath = join(packageOutputRoot, 'cytoscape.html');

  writeFileSync(
    dependencyCruiserJsonPath,
    cruisePackage(workspaceRoot, workspacePackage),
  );
  const elements = dependencyCruiserJsonToCytoscape(
    readFileSync(dependencyCruiserJsonPath, 'utf8'),
  );
  writeCytoscapeArtifacts(cytoscapeJsonPath, cytoscapeHtmlPath, elements);

  return [dependencyCruiserJsonPath, cytoscapeJsonPath, cytoscapeHtmlPath];
}

/**
 * Generates Cytoscape artifacts that describe workspace package relationships.
 *
 * @param outputRoot - Absolute path to the architecture output directory.
 * @param packages - Runtime package metadata to include in the graph.
 * @returns Absolute paths to the generated project graph artifacts.
 */
function generateProjectArtifacts(
  outputRoot: string,
  packages: WorkspacePackage[],
): string[] {
  const elements = packagesToCytoscape(packages);
  const cytoscapeJsonPath = join(
    outputRoot,
    'project-dependencies.cytoscape.json',
  );
  const cytoscapeHtmlPath = join(
    outputRoot,
    'project-dependencies.cytoscape.html',
  );

  writeCytoscapeArtifacts(cytoscapeJsonPath, cytoscapeHtmlPath, elements);

  return [cytoscapeJsonPath, cytoscapeHtmlPath];
}

/**
 * Runs dependency-cruiser for a package source tree.
 *
 * @param workspaceRoot - Absolute path to the repository root.
 * @param workspacePackage - Package metadata for the package to inspect.
 * @returns A dependency-cruiser JSON report.
 */
function cruisePackage(
  workspaceRoot: string,
  workspacePackage: WorkspacePackage,
): string {
  const dependencyCruiserConfig = join(
    workspaceRoot,
    'src',
    'spec-n-roll-arch',
    'dependency-cruiser.config.cjs',
  );
  const sourcePath = join(workspacePackage.root, 'src');

  return execFileSync(
    process.execPath,
    [
      join(
        workspaceRoot,
        'node_modules',
        'dependency-cruiser',
        'bin',
        'dependency-cruise.mjs',
      ),
      '--config',
      dependencyCruiserConfig,
      '--output-type',
      'json',
      sourcePath,
    ],
    { cwd: workspaceRoot, encoding: 'utf8' },
  );
}

/**
 * Converts a dependency-cruiser report into Cytoscape graph elements.
 *
 * @param dependencyCruiserJson - Dependency-cruiser report serialized as JSON.
 * @returns Cytoscape node and edge elements derived from the report.
 */
function dependencyCruiserJsonToCytoscape(
  dependencyCruiserJson: string,
): CytoscapeElement[] {
  const report = JSON.parse(dependencyCruiserJson) as {
    modules?: Array<{
      source: string;
      dependencies?: Array<{ resolved: string }>;
    }>;
  };
  const nodeIds = new Set<string>();
  const edges: CytoscapeElement[] = [];

  for (const module of report.modules ?? []) {
    nodeIds.add(module.source);

    for (const dependency of module.dependencies ?? []) {
      nodeIds.add(dependency.resolved);
      edges.push({
        data: {
          id: `${module.source}->${dependency.resolved}`,
          source: module.source,
          target: dependency.resolved,
        },
      });
    }
  }

  const nodes: CytoscapeElement[] = [...nodeIds].map((id) => ({
    data: { id, label: id },
  }));

  return nodes.concat(edges);
}

/**
 * Converts workspace package dependency metadata into Cytoscape graph elements.
 *
 * @param packages - Runtime package metadata to include in the graph.
 * @returns Cytoscape node and edge elements for package dependencies.
 */
function packagesToCytoscape(packages: WorkspacePackage[]): CytoscapeElement[] {
  const packageNames = new Set(
    packages.map((workspacePackage) => workspacePackage.name),
  );
  const nodes: CytoscapeElement[] = packages.map((workspacePackage) => ({
    data: { id: workspacePackage.name, label: workspacePackage.name },
  }));
  const edges: CytoscapeElement[] = packages.flatMap((workspacePackage) =>
    Object.keys(workspacePackage.dependencies)
      .filter((dependencyName) => packageNames.has(dependencyName))
      .map((dependencyName) => ({
        data: {
          id: `${workspacePackage.name}->${dependencyName}`,
          source: workspacePackage.name,
          target: dependencyName,
        },
      })),
  );

  return nodes.concat(edges);
}

/**
 * Writes matching Cytoscape JSON and browser-renderable HTML graph artifacts.
 *
 * @param cytoscapeJsonPath - Absolute destination path for the JSON artifact.
 * @param cytoscapeHtmlPath - Absolute destination path for the HTML artifact.
 * @param elements - Cytoscape graph elements to serialize.
 */
function writeCytoscapeArtifacts(
  cytoscapeJsonPath: string,
  cytoscapeHtmlPath: string,
  elements: CytoscapeElement[],
): void {
  writeFileSync(cytoscapeJsonPath, `${JSON.stringify(elements, null, 2)}\n`);
  writeFileSync(
    cytoscapeHtmlPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>spec-n-roll dependency graph</title>
    <script src="https://unpkg.com/cytoscape@3.31.2/dist/cytoscape.min.js"></script>
    <style>
      html, body, #cy { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="cy"></div>
    <script>
      cytoscape({
        container: document.getElementById('cy'),
        elements: ${JSON.stringify(elements)},
        style: [
          { selector: 'node', style: { label: 'data(label)', 'background-color': '#3b82f6', color: '#111827' } },
          { selector: 'edge', style: { width: 2, 'line-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#94a3b8', 'curve-style': 'bezier' } }
        ],
        layout: { name: 'breadthfirst', directed: true, padding: 24 }
      });
    </script>
  </body>
</html>
`,
  );
}

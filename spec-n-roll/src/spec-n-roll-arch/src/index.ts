#!/usr/bin/env node
import 'reflect-metadata';
import { ArchCli } from '#arch/presentation/cli/arch-cli.js';

export { ArchitectureArtifactGenerator } from '#arch/application/artifacts/architecture-artifact-generator.js';
export { ArchCli } from '#arch/presentation/cli/arch-cli.js';
export { ArchProgramFactory } from '#arch/composition/architecture/arch-program-factory.js';
export { CytoscapeArtifactWriter } from '#arch/infrastructure/cytoscape/cytoscape-artifact-writer.js';
export type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
export { DependencyCruiserCytoscapeConverter } from '#arch/application/graph/dependency-cruiser-cytoscape-converter.js';
export { DependencyCruiserRunner } from '#arch/infrastructure/dependency-cruiser/dependency-cruiser-runner.js';
export { PackageArchitectureArtifactGenerator } from '#arch/application/artifacts/package-architecture-artifact-generator.js';
export { PackageDependencyCytoscapeConverter } from '#arch/application/graph/package-dependency-cytoscape-converter.js';
export { ProjectArchitectureArtifactGenerator } from '#arch/application/artifacts/project-architecture-artifact-generator.js';
export { RuntimePackageDiscoverer } from '#arch/application/packages/runtime-package-discoverer.js';
export { RuntimePackagePolicy } from '#arch/application/packages/runtime-package-policy.js';
export { WorkspacePackageReader } from '#arch/infrastructure/workspace/workspace-package-reader.js';
export type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';
export { WorkspaceRootResolver } from '#arch/infrastructure/workspace/workspace-root-resolver.js';

new ArchCli().runIfMain(import.meta.url);

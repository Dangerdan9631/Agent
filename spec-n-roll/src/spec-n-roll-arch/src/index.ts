#!/usr/bin/env node
import 'reflect-metadata';
import { ArchCli } from '#arch/arch-cli.js';

export { ArchitectureArtifactGenerator } from '#arch/architecture-artifact-generator.js';
export { ArchCli } from '#arch/arch-cli.js';
export { ArchProgramFactory } from '#arch/arch-program-factory.js';
export { CytoscapeArtifactWriter } from '#arch/cytoscape-artifact-writer.js';
export type { CytoscapeElement } from '#arch/cytoscape-element.js';
export { DependencyCruiserCytoscapeConverter } from '#arch/dependency-cruiser-cytoscape-converter.js';
export { DependencyCruiserRunner } from '#arch/dependency-cruiser-runner.js';
export { PackageArchitectureArtifactGenerator } from '#arch/package-architecture-artifact-generator.js';
export { PackageDependencyCytoscapeConverter } from '#arch/package-dependency-cytoscape-converter.js';
export { ProjectArchitectureArtifactGenerator } from '#arch/project-architecture-artifact-generator.js';
export { RuntimePackageDiscoverer } from '#arch/runtime-package-discoverer.js';
export { RuntimePackagePolicy } from '#arch/runtime-package-policy.js';
export { WorkspacePackageReader } from '#arch/workspace-package-reader.js';
export type { WorkspacePackage } from '#arch/workspace-package.js';
export { WorkspaceRootResolver } from '#arch/workspace-root-resolver.js';

new ArchCli().runIfMain(import.meta.url);

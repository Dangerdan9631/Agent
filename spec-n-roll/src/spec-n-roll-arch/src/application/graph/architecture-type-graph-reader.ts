import type { ArchitectureTypeGraph } from '#arch/application/graph/architecture-type-graph.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Reads TypeScript declarations and their semantic relationships from workspace source.
 */
export interface ArchitectureTypeGraphReader {
  /**
   * Reads a declaration graph for the supplied workspace packages.
   *
   * @param workspaceRoot - Absolute workspace root that contains the source packages.
   * @param packages - Runtime packages whose source declarations are included.
   * @returns A complete workspace declaration graph.
   */
  read(workspaceRoot: string, packages: WorkspacePackage[]): ArchitectureTypeGraph;
}

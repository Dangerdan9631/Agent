import type { DependencyAnalyzer } from '#application/validation/ports/DependencyAnalyzer.js';
import { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import { DependencyRelationship } from '#application/validation/model/DependencyRelationship.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { cruise } from 'dependency-cruiser';
import type { IDependency, IModule } from 'dependency-cruiser';
import { isAbsolute, relative, sep } from 'node:path';

/**
 * Invokes dependency-cruiser and adapts its report into portable Atlas dependency relationships.
 */
export class DependencyCruiserAnalyzer implements DependencyAnalyzer {
  /**
   * Analyses each explicitly selected package in canonical package-name order.
   *
   * @param workspace - Loaded workspace containing source roots and analysis policy.
   * @returns Normalized per-package dependency analysis results.
   */
  public async analyze(workspace: WorkspaceSnapshot): Promise<readonly DependencyAnalysisResult[]> {
    const sortedPackages = [...workspace.packages].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const results: DependencyAnalysisResult[] = [];

    for (const workspacePackage of sortedPackages) {
      results.push(await this.analyzePackage(workspace, workspacePackage));
    }

    return results;
  }

  /**
   * Invokes dependency-cruiser for one workspace package and normalizes its output.
   *
   * @param workspace - Loaded workspace used to make paths portable.
   * @param workspacePackage - Package with existing source roots to analyse.
   * @returns Normalized analysis result for the package.
   */
  private async analyzePackage(
    workspace: WorkspaceSnapshot,
    workspacePackage: WorkspaceSnapshot['packages'][number]
  ): Promise<DependencyAnalysisResult> {
    const reporterOutput = await cruise(
      workspacePackage.sourceRootPaths.map((sourceRootPath) =>
        relative(workspace.paths.workspaceRootPath, sourceRootPath)
      ),
      {
        baseDir: workspace.paths.workspaceRootPath,
        exclude: '(^|/)node_modules(/|$)',
        tsPreCompilationDeps: 'specify'
      }
    );

    if (typeof reporterOutput.output === 'string') {
      throw new Error(
        `dependency-cruiser did not return a machine-readable report for '${workspacePackage.name}'.`
      );
    }

    const rawReport = reporterOutput.output;
    const relationships = rawReport.modules
      .flatMap((module) => this.toRelationships(workspace.paths.workspaceRootPath, module))
      .sort((left, right) => {
        const sourceOrder = left.sourcePath.localeCompare(right.sourcePath);
        if (sourceOrder !== 0) {
          return sourceOrder;
        }
        const targetOrder = (left.targetPath ?? left.moduleSpecifier).localeCompare(
          right.targetPath ?? right.moduleSpecifier
        );
        if (targetOrder !== 0) {
          return targetOrder;
        }
        return left.moduleSpecifier.localeCompare(right.moduleSpecifier);
      });

    return new DependencyAnalysisResult(
      workspacePackage.name,
      relationships,
      this.normalizePortableValue(workspace.paths.workspaceRootPath, rawReport)
    );
  }

  /**
   * Converts one dependency-cruiser module and its dependencies into Atlas relationships.
   *
   * @param workspaceRootPath - Canonical workspace root path.
   * @param module - Dependency-cruiser module record.
   * @returns Relationships originating from the module with portable paths.
   */
  private toRelationships(
    workspaceRootPath: string,
    module: IModule
  ): readonly DependencyRelationship[] {
    const sourcePath = this.toWorkspaceRelativePath(workspaceRootPath, module.source);

    if (sourcePath === undefined) {
      return [];
    }

    return module.dependencies.map((dependency) =>
      this.toRelationship(workspaceRootPath, sourcePath, dependency)
    );
  }

  /**
   * Converts one dependency-cruiser dependency record into an Atlas relationship.
   *
   * @param workspaceRootPath - Canonical workspace root path.
   * @param sourcePath - Portable importing source path.
   * @param dependency - Dependency-cruiser dependency record.
   * @returns Portable Atlas relationship.
   */
  private toRelationship(
    workspaceRootPath: string,
    sourcePath: string,
    dependency: IDependency
  ): DependencyRelationship {
    const targetPath = this.toWorkspaceRelativePath(workspaceRootPath, dependency.resolved);
    const cyclePath = (dependency.cycle ?? [])
      .map((cycleDependency) =>
        this.toWorkspaceRelativePath(workspaceRootPath, cycleDependency.name)
      )
      .filter((cyclePathEntry): cyclePathEntry is string => cyclePathEntry !== undefined);

    return new DependencyRelationship(
      sourcePath,
      targetPath,
      dependency.module,
      dependency.circular,
      cyclePath
    );
  }

  /**
   * Converts a dependency-cruiser path into a stable workspace-relative path when safely contained.
   *
   * @param workspaceRootPath - Canonical workspace root path.
   * @param candidatePath - Relative or absolute adapter path value.
   * @returns Slash-normalized workspace-relative path, or undefined for external paths.
   */
  private toWorkspaceRelativePath(
    workspaceRootPath: string,
    candidatePath: string
  ): string | undefined {
    const relativePath = isAbsolute(candidatePath)
      ? relative(workspaceRootPath, candidatePath)
      : candidatePath;

    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      return undefined;
    }

    return relativePath.replaceAll('\\', '/');
  }

  /**
   * Recursively converts absolute workstation paths in vendor output into portable relative values.
   *
   * @param workspaceRootPath - Canonical workspace root path.
   * @param value - Vendor output value to normalize.
   * @returns Serializable portable clone of the vendor output value.
   */
  private normalizePortableValue(workspaceRootPath: string, value: unknown): unknown {
    if (typeof value === 'string') {
      return this.toWorkspaceRelativePath(workspaceRootPath, value) ?? value;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizePortableValue(workspaceRootPath, entry));
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const normalizedValue: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      normalizedValue[key] = this.normalizePortableValue(workspaceRootPath, nestedValue);
    }
    return normalizedValue;
  }
}

import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { DependencyAnalysisArtifactWriter } from '#application/validation/ports/DependencyAnalysisArtifactWriter.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Atomically writes portable raw dependency-cruiser reports beneath the configured artifact root.
 */
export class NodeDependencyAnalysisArtifactWriter implements DependencyAnalysisArtifactWriter {
  /**
   * Writes deterministic raw reports in canonical package-name order.
   *
   * @param workspace - Loaded workspace with a resolved artifact root.
   * @param analysisResults - Analysis results containing portable vendor-schema reports.
   * @returns A promise that resolves when all report files are persisted.
   */
  public async write(
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): Promise<void> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot persist analysis reports before resolving an artifact root.');
    }

    const analysisDirectoryPath = this.resolveContainedPath(artifactRootPath, 'analysis');
    await mkdir(analysisDirectoryPath, { recursive: true });

    for (const analysisResult of [...analysisResults].sort((left, right) =>
      left.packageName.localeCompare(right.packageName)
    )) {
      const fileName = `${this.encodePackageName(analysisResult.packageName)}.dependency-cruiser.json`;
      const reportPath = this.resolveContainedPath(analysisDirectoryPath, fileName);
      await this.writeAtomically(reportPath, this.serialize(analysisResult.rawReport));
    }
  }

  /**
   * Encodes a package name into a collision-safe filesystem filename segment.
   *
   * @param packageName - Non-empty package manifest name.
   * @returns Filesystem-safe encoded package identity.
   */
  private encodePackageName(packageName: string): string {
    return encodeURIComponent(packageName);
  }

  /**
   * Resolves and verifies one artifact path is contained by its parent artifact root.
   *
   * @param rootPath - Absolute artifact root or known contained artifact directory.
   * @param childPath - Relative artifact child path.
   * @returns Lexically resolved contained child path.
   */
  private resolveContainedPath(rootPath: string, childPath: string): string {
    const resolvedPath = resolve(rootPath, childPath);
    const relativePath = relative(rootPath, resolvedPath);

    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error(`Atlas artifact path '${childPath}' escapes configured root '${rootPath}'.`);
    }

    return resolvedPath;
  }

  /**
   * Serializes values with lexicographically sorted object keys and one trailing newline.
   *
   * @param value - Portable JSON-compatible report value.
   * @returns Canonical formatted JSON text.
   */
  private serialize(value: unknown): string {
    return `${JSON.stringify(this.sortValue(value), undefined, 2)}\n`;
  }

  /**
   * Recursively sorts JSON object keys while retaining array ordering supplied by analysis normalization.
   *
   * @param value - JSON-compatible value to normalize for deterministic serialization.
   * @returns Deeply sorted JSON-compatible value.
   */
  private sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.sortValue(entry));
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const sortedValue: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
      sortedValue[key] = this.sortValue((value as Record<string, unknown>)[key]);
    }
    return sortedValue;
  }

  /**
   * Replaces one artifact file through a same-directory temporary file.
   *
   * @param reportPath - Absolute contained report file path.
   * @param contents - Complete canonical report text.
   * @returns A promise that resolves after replacement completes.
   */
  private async writeAtomically(reportPath: string, contents: string): Promise<void> {
    const temporaryPath = `${reportPath}.tmp-${process.pid}`;
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, reportPath);
  }
}

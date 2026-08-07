import type { AtlasPackageClassification } from '#application/configuration/model/AtlasConfiguration.js';

/**
 * Represents one explicitly classified TypeScript package selected for Atlas analysis.
 */
export class WorkspacePackage {
  /**
   * Creates a discovered package value with paths already resolved and contained by the workspace.
   *
   * @param name - Package manifest name. Must be non-empty and unique within the discovered workspace.
   * @param rootPath - Absolute package directory path.
   * @param relativeRootPath - Slash-normalized package directory path relative to the workspace root.
   * @param sourceRootPaths - Absolute existing source-root paths contained by the package root.
   * @param classification - Explicit runtime or support package classification.
   * @param classes - Stable user-defined package class labels.
   * @param tsconfigPath - Optional absolute existing TypeScript configuration path.
   */
  public constructor(
    public readonly name: string,
    public readonly rootPath: string,
    public readonly relativeRootPath: string,
    public readonly sourceRootPaths: readonly string[],
    public readonly classification: AtlasPackageClassification,
    public readonly classes: readonly string[],
    public readonly tsconfigPath: string | undefined
  ) {}
}

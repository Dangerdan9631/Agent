import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Loads generated Atlas graph data using the artifact root declared by a user-owned configuration file.
 */
export class AtlasArtifactLoader {
  /**
   * Loads the generated landscape graph selected by one Atlas configuration document.
   *
   * @param configurationPath Absolute or process-relative configuration document path.
   * @returns Graph data and paths required by the desktop renderer.
   */
  public async loadLandscape(configurationPath: string): Promise<AtlasLandscapeDocument> {
    const absoluteConfigurationPath = resolve(configurationPath);
    const configuration = this.toRecord(
      JSON.parse(await readFile(absoluteConfigurationPath, 'utf8')) as unknown,
      absoluteConfigurationPath
    );
    const configurationDirectoryPath = resolve(absoluteConfigurationPath, '..');
    const artifacts = this.toOptionalRecord(configuration.artifacts, absoluteConfigurationPath);
    const artifactRootValue = artifacts?.root;
    const artifactRootPath =
      typeof artifactRootValue === 'string' && artifactRootValue.length > 0
        ? isAbsolute(artifactRootValue)
          ? artifactRootValue
          : resolve(configurationDirectoryPath, artifactRootValue)
        : resolve(configurationDirectoryPath, 'architecture');
    const graphPath = await this.resolveLandscapeGraphPath(artifactRootPath);
    const graph = this.toGraph(
      JSON.parse(await readFile(graphPath, 'utf8')) as unknown,
      graphPath
    );
    return new AtlasLandscapeDocument(absoluteConfigurationPath, artifactRootPath, graphPath, graph);
  }

  /**
   * Resolves the landscape graph through the deterministic artifact index when one is available.
   *
   * @param artifactRootPath Absolute generated artifact root.
   * @returns Absolute contained landscape graph path.
   */
  private async resolveLandscapeGraphPath(artifactRootPath: string): Promise<string> {
    const indexPath = resolve(artifactRootPath, 'atlas-diagrams.json');
    try {
      const index = this.toRecord(JSON.parse(await readFile(indexPath, 'utf8')) as unknown, indexPath);
      const diagrams = index.diagrams;
      if (!Array.isArray(diagrams)) {
        throw new Error(`Atlas artifact index '${indexPath}' must contain diagrams.`);
      }
      const landscape = diagrams.find(
        (entry): entry is Record<string, unknown> =>
          typeof entry === 'object' && entry !== null && !Array.isArray(entry) &&
          (entry as Record<string, unknown>).scope === 'landscape'
      );
      if (landscape === undefined || typeof landscape.graphPath !== 'string') {
        throw new Error(`Atlas artifact index '${indexPath}' does not contain a landscape graph.`);
      }
      return this.toContainedArtifactPath(artifactRootPath, landscape.graphPath);
    } catch (error: unknown) {
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        throw error;
      }
      return resolve(artifactRootPath, 'landscape', 'graph.json');
    }
  }

  /**
   * Resolves one index-relative graph path while rejecting paths that escape the artifact root.
   *
   * @param artifactRootPath Absolute generated artifact root.
   * @param artifactPath Index-relative graph path.
   * @returns Absolute contained artifact path.
   */
  private toContainedArtifactPath(artifactRootPath: string, artifactPath: string): string {
    if (isAbsolute(artifactPath)) {
      throw new Error('Atlas artifact index paths must be relative.');
    }
    const resolvedPath = resolve(artifactRootPath, artifactPath);
    const pathFromRoot = relative(artifactRootPath, resolvedPath);
    if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`)) {
      throw new Error(`Atlas artifact path '${artifactPath}' escapes its artifact root.`);
    }
    return resolvedPath;
  }

  /**
   * Narrows one arbitrary JSON value to an object record.
   *
   * @param value Parsed JSON value.
   * @param path Path used in the failure diagnostic.
   * @returns Object record with no assumed field shapes.
   */
  private toRecord(value: unknown, path: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Atlas configuration '${path}' must contain a JSON object.`);
    }
    return value as Record<string, unknown>;
  }

  /**
   * Narrows an optional JSON object field without accepting arrays.
   *
   * @param value Parsed optional field value.
   * @param path Path used in the failure diagnostic.
   * @returns Object record when supplied, otherwise undefined.
   */
  private toOptionalRecord(value: unknown, path: string): Record<string, unknown> | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.toRecord(value, path);
  }

  /**
   * Validates the minimum graph document shape needed by the renderer.
   *
   * @param value Parsed graph JSON value.
   * @param path Path used in the failure diagnostic.
   * @returns Renderer-safe graph document.
   */
  private toGraph(value: unknown, path: string): AtlasGraphDocument {
    const graph = this.toRecord(value, path);
    const elements = this.toRecord(graph.elements, path);
    if (!Array.isArray(elements.nodes) || !Array.isArray(elements.edges)) {
      throw new Error(`Atlas graph '${path}' must contain node and edge arrays.`);
    }
    return graph as unknown as AtlasGraphDocument;
  }
}

/**
 * Identifies the generated landscape graph selected by the desktop application.
 */
export class AtlasLandscapeDocument {
  /**
   * Creates a graph result from resolved user configuration and generated artifact paths.
   *
   * @param configurationPath Absolute configuration document path.
   * @param artifactRootPath Absolute generated artifact root.
   * @param graphPath Absolute selected landscape graph path.
   * @param graph Renderer-safe graph data.
   */
  public constructor(
    public readonly configurationPath: string,
    public readonly artifactRootPath: string,
    public readonly graphPath: string,
    public readonly graph: AtlasGraphDocument
  ) {}
}

/**
 * Represents the persisted graph data consumed by the Electron renderer.
 */
export interface AtlasGraphDocument {
  /** Readable title of the generated diagram scope. */
  readonly title?: string;
  /** Cytoscape-compatible graph element arrays. */
  readonly elements: AtlasGraphElements;
}

/**
 * Groups persisted graph nodes and edges.
 */
export interface AtlasGraphElements {
  /** Graph nodes with renderer-owned data payloads. */
  readonly nodes: readonly AtlasGraphElement[];
  /** Directed relationships with renderer-owned data payloads. */
  readonly edges: readonly AtlasGraphElement[];
}

/**
 * Represents one Cytoscape-compatible persisted element.
 */
export interface AtlasGraphElement {
  /** Untyped persisted renderer payload retained without lossy conversion. */
  readonly data: Record<string, unknown>;
}

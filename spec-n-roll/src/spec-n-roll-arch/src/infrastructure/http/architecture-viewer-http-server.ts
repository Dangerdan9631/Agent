import { existsSync } from 'node:fs';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { Logger } from 'tslog';
import type {
  ArchitectureConfig,
  ArchitectureFolderDiagramConfig,
} from '#arch/application/config/architecture-config.js';
import { ArchitectureArtifactGenerator } from '#arch/application/artifacts/architecture-artifact-generator.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';

/**
 * Defines the schema version accepted by checked-in architecture diagram layouts.
 */
const ARCHITECTURE_LAYOUT_VERSION = 3;

/**
 * Defines the file signature required for persisted PNG diagram image exports.
 */
const PNG_FILE_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Describes the settings used to start the local architecture viewer.
 */
export interface ArchitectureViewerHttpServerOptions {
  /**
   * Absolute repository artifact directory containing generated architecture HTML and JSON files.
   */
  artifactRoot: string;

  /**
   * Network host for the local viewer. The value should usually be loopback-only.
   */
  host: string;

  /**
   * Network port for the local viewer. Use 0 to request an available port from the OS.
   */
  port: number;

  /**
   * Absolute repository root containing the user-editable architecture config file. When omitted, config writes use the artifact root ancestry.
   */
  workspaceRoot?: string;
}

/**
 * Describes a running local architecture viewer server.
 */
export interface RunningArchitectureViewerHttpServer {
  /**
   * Browser URL for the local architecture viewer root page.
   */
  url: string;

  /**
   * Stops the local viewer server after in-flight requests complete.
   *
   * @returns A promise that resolves after the server has stopped listening.
   */
  close(): Promise<void>;
}

/**
 * Describes a viewer request to update user-editable architecture configuration.
 */
interface ArchitectureViewerConfigAction {
  /**
   * Requested configuration action. Supported values include node hiding, folder diagram creation, and exclusion updates.
   */
  action:
    | 'hide-node'
    | 'create-folder-diagram'
    | 'add-exclusion'
    | 'remove-exclusion';

  /**
   * Cytoscape node id selected by the user. The id must exist in the current diagram JSON.
   */
  nodeId?: string;

  /**
   * Exclusion collection updated by an exclusion action.
   */
  scope?: 'all-packages' | 'diagram';

  /**
   * Node-name exclusion added or removed by an exclusion action.
   */
  exclusion?: string;
}

/**
 * Describes one persisted node position in Cytoscape model coordinates.
 */

/**
 * Describes the generated diagram that originated a viewer configuration update.
 */
interface ArchitectureViewerDiagramContext {
  /**
   * Diagram scope used to decide where root configuration exclusions should be written.
   */
  kind: 'project' | 'package' | 'folder';

  /**
   * Workspace package name for package and folder diagrams. The value is omitted for project diagrams.
   */
  packageName?: string;

  /**
   * Folder diagram configuration object owned by the root architecture config. The value is present only for configured folder diagrams.
   */
  folderDiagram?: ArchitectureFolderDiagramConfig;
}

/**
 * Describes the exclusion rules displayed for the currently viewed diagram.
 */
interface ArchitectureViewerExclusions {
  /**
   * Node-name exclusions that apply to every workspace package.
   */
  allPackages: string[];

  /**
   * Node-name exclusions that apply only to the current diagram.
   */
  diagram: string[];

  /**
   * Human-readable label for the diagram-specific exclusion section.
   */
  diagramLabel: string;
}
interface PersistedNodeLayout {
  /**
   * Parent Cytoscape node id, or null for root-level nodes.
   */
  parentId: string | null;

  /**
   * Absolute Cytoscape model position for the node.
   */
  position: {
    /**
     * Absolute horizontal Cytoscape model coordinate.
     */
    x: number;

    /**
     * Absolute vertical Cytoscape model coordinate.
     */
    y: number;
  };
}

/**
 * Describes a persisted architecture diagram layout.
 */
interface PersistedArchitectureLayout {
  /**
   * Layout schema version used to reject incompatible saved layouts.
   */
  version: number;

  /**
   * Saved node positions keyed by Cytoscape node id.
   */
  nodes: Record<string, PersistedNodeLayout>;

  /**
   * Hidden dependency connection ids keyed by the backing Cytoscape edge id.
   */
  hiddenConnections: string[];
}

/**
 * Serves generated architecture diagrams and persists layout changes to checked-in files.
 */
export class ArchitectureViewerHttpServer {
  /**
   * Creates an architecture viewer server.
   *
   * @param logger - Logger used to report the serving URL and rejected persistence requests.
   */
  constructor(
    private readonly generator?: ArchitectureArtifactGenerator,
    private readonly logger = new Logger({
      name: 'spec-n-roll-arch-viewer',
      minLevel: 6,
    }),
  ) {}

  /**
   * Starts serving architecture artifacts and the layout persistence endpoint.
   *
   * @param options - Viewer root and network options for the local server.
   * @returns The running server handle and browser URL.
   */
  async start(
    options: ArchitectureViewerHttpServerOptions,
  ): Promise<RunningArchitectureViewerHttpServer> {
    const artifactRoot = resolve(options.artifactRoot);
    const workspaceRoot = resolve(
      options.workspaceRoot ?? join(artifactRoot, '..', '..', '..'),
    );
    const server = createServer((request, response) => {
      void this.handleRequest(request, response, artifactRoot, workspaceRoot);
    });

    await new Promise<void>((resolveStart, rejectStart) => {
      server.once('error', rejectStart);
      server.listen(options.port, options.host, () => {
        server.off('error', rejectStart);
        resolveStart();
      });
    });

    const address = server.address();
    const port =
      typeof address === 'object' && address ? address.port : options.port;
    const url = `http://${options.host}:${port}/`;
    this.logger.info('Serving architecture viewer.', { artifactRoot, url });

    return {
      url,
      close: () => this.close(server),
    };
  }

  private async close(server: Server): Promise<void> {
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) {
          rejectClose(error);
          return;
        }
        resolveClose();
      });
    });
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    artifactRoot: string,
    workspaceRoot: string,
  ): Promise<void> {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (
        request.method === 'GET' &&
        url.pathname === '/__spec-n-roll/config'
      ) {
        await this.readConfig(response, workspaceRoot, url);
        return;
      }

      if (
        request.method === 'PUT' &&
        url.pathname === '/__spec-n-roll/layout'
      ) {
        await this.persistLayout(request, response, artifactRoot, url);
        return;
      }

      if (
        request.method === 'POST' &&
        url.pathname === '/__spec-n-roll/config'
      ) {
        await this.persistConfig(
          request,
          response,
          artifactRoot,
          workspaceRoot,
          url,
        );
        return;
      }

      if (
        request.method === 'POST' &&
        url.pathname === '/__spec-n-roll/image'
      ) {
        await this.persistImage(request, response, artifactRoot, url);
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        this.respondText(response, 405, 'Method not allowed.');
        return;
      }

      await this.serveArtifact(request, response, artifactRoot, url);
    } catch (error) {
      this.logger.error('Architecture viewer request failed.', { error });
      this.respondText(response, 500, 'Internal server error.');
    }
  }

  private async serveArtifact(
    request: IncomingMessage,
    response: ServerResponse,
    artifactRoot: string,
    url: URL,
  ): Promise<void> {
    const relativePath =
      url.pathname === '/' ? 'landscape.cytoscape.html' : url.pathname.slice(1);
    const filePath = this.resolveArtifactPath(artifactRoot, relativePath);
    if (!filePath) {
      this.respondText(response, 400, 'Invalid artifact path.');
      return;
    }

    try {
      const content = await readFile(filePath);
      response.writeHead(200, { 'content-type': this.contentType(filePath) });
      if (request.method !== 'HEAD') {
        response.end(content);
        return;
      }
      response.end();
    } catch {
      this.respondText(response, 404, 'Artifact not found.');
    }
  }

  private async persistLayout(
    request: IncomingMessage,
    response: ServerResponse,
    artifactRoot: string,
    url: URL,
  ): Promise<void> {
    const diagramPath = url.searchParams.get('diagram');
    if (!diagramPath || !diagramPath.endsWith('.html')) {
      this.respondText(response, 400, 'A diagram HTML path is required.');
      return;
    }

    const htmlPath = this.resolveArtifactPath(artifactRoot, diagramPath);
    if (!htmlPath) {
      this.respondText(response, 400, 'Invalid diagram path.');
      return;
    }

    const jsonPath = htmlPath.replace(/\.html$/u, '.json');
    const layoutPath = htmlPath.replace(/\.html$/u, '.layout.json');
    const parsedLayout = await this.readJsonBody(request);
    if (!parsedLayout) {
      this.respondText(response, 400, 'Invalid layout JSON.');
      return;
    }

    const layout = this.cleanLayout(
      parsedLayout,
      await this.readElements(jsonPath),
    );
    if (!layout) {
      this.respondText(response, 400, 'Invalid layout.');
      return;
    }

    await mkdir(dirname(layoutPath), { recursive: true });
    await writeFile(layoutPath, `${JSON.stringify(layout, null, 2)}\n`);
    this.respondJson(response, 200, { saved: true });
  }

  private async persistImage(
    request: IncomingMessage,
    response: ServerResponse,
    artifactRoot: string,
    url: URL,
  ): Promise<void> {
    const diagramPath = url.searchParams.get('diagram');
    if (!diagramPath || !diagramPath.endsWith('.html')) {
      this.respondText(response, 400, 'A diagram HTML path is required.');
      return;
    }

    const htmlPath = this.resolveArtifactPath(artifactRoot, diagramPath);
    if (!htmlPath) {
      this.respondText(response, 400, 'Invalid diagram path.');
      return;
    }

    const jsonPath = htmlPath.replace(/\.html$/u, '.json');
    if (!existsSync(jsonPath)) {
      this.respondText(response, 400, 'Diagram JSON was not found.');
      return;
    }

    const image = await this.readBody(request);
    if (!this.isPngImage(image)) {
      this.respondText(response, 400, 'Invalid diagram image.');
      return;
    }

    const fileName = this.exportedImageFileName(htmlPath);
    const imagePath = join(dirname(htmlPath), fileName);
    await mkdir(dirname(imagePath), { recursive: true });
    await writeFile(imagePath, image);
    this.respondJson(response, 200, { saved: true, fileName });
  }

  private async persistConfig(
    request: IncomingMessage,
    response: ServerResponse,
    artifactRoot: string,
    workspaceRoot: string,
    url: URL,
  ): Promise<void> {
    const diagramPath = url.searchParams.get('diagram');
    if (!diagramPath || !diagramPath.endsWith('.html')) {
      this.respondText(response, 400, 'A diagram HTML path is required.');
      return;
    }

    const htmlPath = this.resolveArtifactPath(artifactRoot, diagramPath);
    if (!htmlPath) {
      this.respondText(response, 400, 'Invalid diagram path.');
      return;
    }

    const action = await this.readJsonBody(request);
    if (!this.isArchitectureViewerConfigAction(action)) {
      this.respondText(response, 400, 'Invalid config action.');
      return;
    }

    const requiresNode =
      action.action === 'hide-node' ||
      action.action === 'create-folder-diagram';
    const elements = requiresNode
      ? await this.readElements(htmlPath.replace(/\.html$/u, '.json'))
      : [];
    const node = elements
      .filter((element) => this.isNodeElement(element))
      .find((element) => element.data.id === action.nodeId);
    if (requiresNode && !node) {
      this.respondText(response, 400, 'Selected node was not found.');
      return;
    }

    const updated = await this.updateConfig(
      workspaceRoot,
      action,
      node,
      elements,
      diagramPath,
    );
    if (!updated) {
      this.respondText(response, 400, 'Selected node is not configurable.');
      return;
    }

    this.respondJson(response, 200, { saved: true });
  }

  private async readConfig(
    response: ServerResponse,
    workspaceRoot: string,
    url: URL,
  ): Promise<void> {
    const diagramPath = url.searchParams.get('diagram');
    if (!diagramPath || !diagramPath.endsWith('.html')) {
      this.respondText(response, 400, 'A diagram HTML path is required.');
      return;
    }

    const config = this.readArchitectureConfig(workspaceRoot);
    const diagramContext = this.diagramContext(diagramPath, config);
    if (!diagramContext) {
      this.respondText(response, 400, 'Unknown diagram path.');
      return;
    }

    this.respondJson(response, 200, this.exclusionsFor(config, diagramContext));
  }

  private async updateConfig(
    workspaceRoot: string,
    action: ArchitectureViewerConfigAction,
    node: (CytoscapeElement & { data: { id: string } }) | undefined,
    elements: CytoscapeElement[],
    diagramPath: string,
  ): Promise<boolean> {
    const config = this.readArchitectureConfig(workspaceRoot);
    const diagramContext = this.diagramContext(diagramPath, config);
    if (!diagramContext) {
      return false;
    }

    if (
      action.action === 'add-exclusion' ||
      action.action === 'remove-exclusion'
    ) {
      if (!action.scope || !action.exclusion) {
        return false;
      }
      this.updateExclusion(config, diagramContext, action);
      await this.writeArchitectureConfig(workspaceRoot, config);
      this.regenerateArtifacts(workspaceRoot);
      return true;
    }

    if (action.action === 'hide-node' && node && this.isExternalNode(node)) {
      this.configureHiddenExternalDependency(
        config,
        diagramContext,
        node.data.label,
      );
      await this.writeArchitectureConfig(workspaceRoot, config);
      this.regenerateArtifacts(workspaceRoot);
      return true;
    }

    const projectFile = node ? this.projectFileSelection(node, elements) : null;
    if (action.action === 'hide-node' && projectFile) {
      this.addProjectFileExclusion(config, diagramContext, projectFile);
      await this.writeArchitectureConfig(workspaceRoot, config);
      this.regenerateArtifacts(workspaceRoot);
      return true;
    }

    const folder = node ? this.folderSelection(node) : null;
    if (action.action === 'create-folder-diagram' && folder) {
      config.folderDiagrams ??= {};
      config.folderDiagrams.packages ??= {};
      const packageDiagrams =
        config.folderDiagrams.packages[folder.packageName] ?? [];
      config.folderDiagrams.packages[folder.packageName] = [
        ...packageDiagrams.filter(
          (diagram) =>
            this.normalizeConfigPath(diagram.path) !== folder.folderPath,
        ),
        { path: folder.folderPath },
      ].sort((left, right) =>
        this.normalizeConfigPath(left.path).localeCompare(
          this.normalizeConfigPath(right.path),
        ),
      );
      await this.writeArchitectureConfig(workspaceRoot, config);
      this.regenerateArtifacts(workspaceRoot);
      return true;
    }

    return false;
  }

  private diagramContext(
    diagramPath: string,
    config: ArchitectureConfig,
  ): ArchitectureViewerDiagramContext | null {
    const normalizedPath = this.normalizeConfigPath(diagramPath);
    if (normalizedPath === 'landscape.cytoscape.html') {
      return { kind: 'project' };
    }

    const packageMatch = /^([^/]+)\/cytoscape\.html$/u.exec(normalizedPath);
    if (packageMatch) {
      return { kind: 'package', packageName: packageMatch[1] };
    }

    const folderMatch = /^([^/]+)\/(folder-.+)\.cytoscape\.html$/u.exec(
      normalizedPath,
    );
    if (!folderMatch) {
      return null;
    }

    const packageName = folderMatch[1];
    const folderDiagram = this.folderDiagramForSlug(
      config,
      packageName,
      folderMatch[2],
    );
    if (!folderDiagram) {
      return null;
    }

    return { kind: 'folder', packageName, folderDiagram };
  }

  private folderDiagramForSlug(
    config: ArchitectureConfig,
    packageName: string,
    slug: string,
  ): ArchitectureFolderDiagramConfig | null {
    return (
      config.folderDiagrams?.packages?.[packageName]?.find(
        (folderDiagram) => this.diagramSlug(folderDiagram.path) === slug,
      ) ?? null
    );
  }

  private configureHiddenExternalDependency(
    config: ArchitectureConfig,
    diagramContext: ArchitectureViewerDiagramContext,
    dependencyName: string,
  ): void {
    if (diagramContext.kind === 'project') {
      config.exclusions ??= {};
      config.exclusions.landscape = this.sortedUnique([
        ...(config.exclusions.landscape ?? []),
        dependencyName,
      ]);
      return;
    }

    if (diagramContext.kind === 'folder' && diagramContext.folderDiagram) {
      diagramContext.folderDiagram.exclusions ??= {};
      diagramContext.folderDiagram.exclusions.projectFiles = this.sortedUnique([
        ...(diagramContext.folderDiagram.exclusions.projectFiles ?? []),
        dependencyName,
      ]);
      return;
    }

    const packageName = diagramContext.packageName ?? '';
    config.exclusions ??= {};
    config.exclusions.projectFiles ??= {};
    config.exclusions.projectFiles.packages ??= {};
    config.exclusions.projectFiles.packages[packageName] = this.sortedUnique([
      ...(config.exclusions.projectFiles.packages[packageName] ?? []),
      dependencyName,
    ]);
  }

  private addProjectFileExclusion(
    config: ArchitectureConfig,
    diagramContext: ArchitectureViewerDiagramContext,
    projectFile: { packageName: string; nodeName: string },
  ): void {
    if (
      diagramContext.kind === 'folder' &&
      diagramContext.folderDiagram &&
      diagramContext.packageName === projectFile.packageName
    ) {
      diagramContext.folderDiagram.exclusions ??= {};
      diagramContext.folderDiagram.exclusions.projectFiles = this.sortedUnique([
        ...(config.exclusions?.projectFiles?.packages?.[
          projectFile.packageName
        ] ?? []),
        ...(diagramContext.folderDiagram.exclusions.projectFiles ?? []),
        projectFile.nodeName,
      ]);
      return;
    }

    config.exclusions ??= {};
    config.exclusions.projectFiles ??= {};
    config.exclusions.projectFiles.packages ??= {};
    config.exclusions.projectFiles.packages[projectFile.packageName] =
      this.sortedUnique([
        ...(config.exclusions.projectFiles.packages[projectFile.packageName] ??
          []),
        projectFile.nodeName,
      ]);
  }

  private exclusionsFor(
    config: ArchitectureConfig,
    diagramContext: ArchitectureViewerDiagramContext,
  ): ArchitectureViewerExclusions {
    const allPackages = config.exclusions?.projectFiles?.allPackages ?? [];
    if (diagramContext.kind === 'project') {
      return {
        allPackages,
        diagram: config.exclusions?.landscape ?? [],
        diagramLabel: 'Landscape',
      };
    }

    const packageName = diagramContext.packageName ?? '';
    return {
      allPackages,
      diagram:
        diagramContext.folderDiagram?.exclusions?.projectFiles ??
        config.exclusions?.projectFiles?.packages?.[packageName] ??
        [],
      diagramLabel: packageName,
    };
  }

  private updateExclusion(
    config: ArchitectureConfig,
    diagramContext: ArchitectureViewerDiagramContext,
    action: ArchitectureViewerConfigAction,
  ): void {
    const exclusion = this.normalizeConfigPath(action.exclusion ?? '');
    config.exclusions ??= {};
    if (action.scope === 'all-packages') {
      config.exclusions.projectFiles ??= {};
      config.exclusions.projectFiles.allPackages = this.updatedExclusions(
        config.exclusions.projectFiles.allPackages ?? [],
        exclusion,
        action.action,
      );
      return;
    }

    if (diagramContext.kind === 'project') {
      config.exclusions.landscape = this.updatedExclusions(
        config.exclusions.landscape ?? [],
        exclusion,
        action.action,
      );
      return;
    }

    const packageName = diagramContext.packageName ?? '';
    if (diagramContext.folderDiagram) {
      diagramContext.folderDiagram.exclusions ??= {};
      diagramContext.folderDiagram.exclusions.projectFiles =
        this.updatedExclusions(
          diagramContext.folderDiagram.exclusions.projectFiles ?? [],
          exclusion,
          action.action,
        );
      return;
    }

    config.exclusions.projectFiles ??= {};
    config.exclusions.projectFiles.packages ??= {};
    config.exclusions.projectFiles.packages[packageName] =
      this.updatedExclusions(
        config.exclusions.projectFiles.packages[packageName] ?? [],
        exclusion,
        action.action,
      );
  }

  private updatedExclusions(
    exclusions: string[],
    exclusion: string,
    action: ArchitectureViewerConfigAction['action'],
  ): string[] {
    return action === 'add-exclusion'
      ? this.sortedUnique([...exclusions, exclusion])
      : exclusions.filter((candidate) => candidate !== exclusion);
  }

  private regenerateArtifacts(workspaceRoot: string): void {
    this.generator?.generate(workspaceRoot);
  }

  private diagramSlug(folderPath: string): string {
    return `folder-${this.normalizeConfigPath(folderPath).replaceAll('/', '-')}`;
  }
  private isExternalNode(
    node: CytoscapeElement & { data: { id: string } },
  ): node is CytoscapeElement & { data: { id: string; label: string } } {
    return node.data.externalDependency === 'true' && !!node.data.label;
  }

  private projectFileSelection(
    node: CytoscapeElement & { data: { id: string } },
    elements: CytoscapeElement[],
  ): { packageName: string; nodeName: string } | null {
    if (this.isExternalNode(node) || this.hasChildren(node, elements)) {
      return null;
    }

    const match = /^src\/([^/]+)\/(.+)$/u.exec(
      this.normalizeConfigPath(node.data.id),
    );
    if (!match) {
      return null;
    }

    return {
      packageName: match[1],
      nodeName: match[2].replace(/^src\//u, '').replace(/\.[^./]+$/u, ''),
    };
  }

  private folderSelection(
    node: CytoscapeElement & { data: { id: string } },
  ): { packageName: string; folderPath: string } | null {
    const normalizedId = this.normalizeConfigPath(node.data.id);
    const folderRootMatch = /^folder:([^:]+):(.+)$/u.exec(normalizedId);
    if (folderRootMatch) {
      return {
        packageName: folderRootMatch[1],
        folderPath: this.normalizeConfigPath(folderRootMatch[2]),
      };
    }

    const folderChildMatch = /^directory:folder:([^:]+):(.+):(.+)$/u.exec(
      normalizedId,
    );
    if (folderChildMatch) {
      return {
        packageName: folderChildMatch[1],
        folderPath: this.normalizeConfigPath(
          `${folderChildMatch[2]}/${folderChildMatch[3]}`,
        ),
      };
    }

    const packageFolderMatch = /^directory:([^:]+):(.+)$/u.exec(normalizedId);
    if (!packageFolderMatch) {
      return null;
    }

    return {
      packageName: packageFolderMatch[1],
      folderPath: this.normalizeConfigPath(`src/${packageFolderMatch[2]}`),
    };
  }

  private hasChildren(
    node: CytoscapeElement & { data: { id: string } },
    elements: CytoscapeElement[],
  ): boolean {
    return elements.some(
      (element) =>
        this.isNodeElement(element) && element.data.parent === node.data.id,
    );
  }

  private readArchitectureConfig(workspaceRoot: string): ArchitectureConfig {
    const configPath = this.architectureConfigPath(workspaceRoot);
    if (!existsSync(configPath)) {
      return {};
    }

    const requireConfig = createRequire(import.meta.url);
    delete requireConfig.cache[requireConfig.resolve(configPath)];
    return requireConfig(configPath) as ArchitectureConfig;
  }

  private async writeArchitectureConfig(
    workspaceRoot: string,
    config: ArchitectureConfig,
  ): Promise<void> {
    await writeFile(
      this.architectureConfigPath(workspaceRoot),
      `${this.architectureConfigHeader()}module.exports = ${JSON.stringify(config, null, 2)};\n`,
    );
  }

  private architectureConfigPath(workspaceRoot: string): string {
    return join(workspaceRoot, 'spec-n-roll.architecture.config.cjs');
  }

  private architectureConfigHeader(): string {
    return `// User-editable architecture diagram configuration.
//
// External dependencies are matched by displayed package/module name, such as
// "tslog", "commander", or "fs". Collapsed dependencies render as one node;
// landscape exclusions are omitted from the landscape diagram. Project node
// exclusions are exact node names or node-name globs, such as
// "composition/**/*.test". Node names are relative to the package source root
// and omit the file extension.
//
// Folder diagrams are opt in per package. Paths are relative to the package root,
// such as "src/application". Folder collapse and exclusion settings inherit the
// workspace settings unless overridden on that folder diagram.
//
// Diagram layouts are saved automatically by the architecture viewer as checked-in
// *.layout.json files next to each generated diagram artifact.
`;
  }

  private sortedUnique(values: string[]): string[] {
    return [
      ...new Set(values.map((value) => this.normalizeConfigPath(value))),
    ].sort();
  }

  private normalizeConfigPath(value: string): string {
    return value
      .replaceAll('\\', '/')
      .replace(/^\.\//u, '')
      .replace(/\/$/u, '');
  }

  private async readElements(jsonPath: string): Promise<CytoscapeElement[]> {
    const parsed = JSON.parse(await readFile(jsonPath, 'utf8'));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as CytoscapeElement[];
  }

  private async readJsonBody(request: IncomingMessage): Promise<unknown> {
    try {
      return JSON.parse((await this.readBody(request)).toString('utf8'));
    } catch {
      return null;
    }
  }

  private async readBody(request: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private cleanLayout(
    layout: unknown,
    elements: CytoscapeElement[],
  ): PersistedArchitectureLayout | null {
    if (!this.isPersistedArchitectureLayout(layout)) {
      return null;
    }

    const nodeIds = new Set(
      elements
        .filter((element) => this.isNodeElement(element))
        .map((element) => element.data.id),
    );
    const edgeIds = new Set(
      elements
        .filter((element) => this.isEdgeElement(element))
        .map((element) => element.data.id),
    );
    const nodes: Record<string, PersistedNodeLayout> = {};

    for (const [nodeId, nodeLayout] of Object.entries(layout.nodes)) {
      if (!nodeIds.has(nodeId)) {
        continue;
      }
      if (nodeLayout.parentId && !nodeIds.has(nodeLayout.parentId)) {
        continue;
      }

      nodes[nodeId] = nodeLayout;
    }

    return {
      version: ARCHITECTURE_LAYOUT_VERSION,
      nodes,
      hiddenConnections: layout.hiddenConnections.filter((edgeId) =>
        edgeIds.has(edgeId),
      ),
    };
  }

  private resolveArtifactPath(
    artifactRoot: string,
    relativePath: string,
  ): string | null {
    const decodedPath = decodeURIComponent(relativePath).replaceAll('\\', '/');
    const resolvedPath = resolve(artifactRoot, decodedPath);
    const relativeResolvedPath = relative(artifactRoot, resolvedPath);
    if (
      relativeResolvedPath.startsWith('..') ||
      relativeResolvedPath === '..' ||
      relativeResolvedPath.includes(`..${sep}`) ||
      resolve(artifactRoot, relativeResolvedPath) !== resolvedPath
    ) {
      return null;
    }

    return resolvedPath;
  }

  private exportedImageFileName(htmlPath: string): string {
    const baseName = basename(htmlPath, '.html');
    const timestamp = new Date().toISOString().replaceAll(':', '-');

    return `${baseName}.${timestamp}.png`;
  }

  private isPngImage(image: Buffer): boolean {
    return (
      image.length >= PNG_FILE_SIGNATURE.length &&
      image.subarray(0, PNG_FILE_SIGNATURE.length).equals(PNG_FILE_SIGNATURE)
    );
  }

  private contentType(filePath: string): string {
    switch (extname(filePath)) {
      case '.html':
        return 'text/html; charset=utf-8';
      case '.json':
        return 'application/json; charset=utf-8';
      case '.js':
        return 'text/javascript; charset=utf-8';
      case '.css':
        return 'text/css; charset=utf-8';
      case '.png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }

  private respondJson(
    response: ServerResponse,
    statusCode: number,
    body: unknown,
  ): void {
    response.writeHead(statusCode, {
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(`${JSON.stringify(body)}\n`);
  }

  private respondText(
    response: ServerResponse,
    statusCode: number,
    body: string,
  ): void {
    response.writeHead(statusCode, {
      'content-type': 'text/plain; charset=utf-8',
    });
    response.end(body);
  }

  private isArchitectureViewerConfigAction(
    action: unknown,
  ): action is ArchitectureViewerConfigAction {
    if (!action || typeof action !== 'object') {
      return false;
    }

    const candidate = action as {
      action?: unknown;
      nodeId?: unknown;
      scope?: unknown;
      exclusion?: unknown;
    };

    return (
      ((candidate.action === 'hide-node' ||
        candidate.action === 'create-folder-diagram') &&
        typeof candidate.nodeId === 'string') ||
      ((candidate.action === 'add-exclusion' ||
        candidate.action === 'remove-exclusion') &&
        (candidate.scope === 'all-packages' || candidate.scope === 'diagram') &&
        typeof candidate.exclusion === 'string')
    );
  }

  private isPersistedArchitectureLayout(
    layout: unknown,
  ): layout is PersistedArchitectureLayout {
    if (!layout || typeof layout !== 'object') {
      return false;
    }

    const candidate = layout as {
      version?: unknown;
      nodes?: unknown;
      hiddenConnections?: unknown;
    };

    return (
      candidate.version === ARCHITECTURE_LAYOUT_VERSION &&
      !!candidate.nodes &&
      typeof candidate.nodes === 'object' &&
      Object.values(candidate.nodes).every((nodeLayout) =>
        this.isPersistedNodeLayout(nodeLayout),
      ) &&
      Array.isArray(candidate.hiddenConnections) &&
      candidate.hiddenConnections.every((edgeId) => typeof edgeId === 'string')
    );
  }

  private isPersistedNodeLayout(
    nodeLayout: unknown,
  ): nodeLayout is PersistedNodeLayout {
    if (!nodeLayout || typeof nodeLayout !== 'object') {
      return false;
    }

    const candidate = nodeLayout as {
      parentId?: unknown;
      position?: { x?: unknown; y?: unknown };
    };

    return (
      (candidate.parentId === null || typeof candidate.parentId === 'string') &&
      !!candidate.position &&
      typeof candidate.position.x === 'number' &&
      typeof candidate.position.y === 'number'
    );
  }

  private isEdgeElement(
    element: CytoscapeElement,
  ): element is CytoscapeElement & {
    data: { id: string; source: string; target: string };
  } {
    return (
      typeof element.data.id === 'string' &&
      typeof element.data.source === 'string' &&
      typeof element.data.target === 'string'
    );
  }

  private isNodeElement(
    element: CytoscapeElement,
  ): element is CytoscapeElement & { data: { id: string } } {
    return (
      typeof element.data.id === 'string' &&
      typeof element.data.source !== 'string' &&
      typeof element.data.target !== 'string'
    );
  }
}

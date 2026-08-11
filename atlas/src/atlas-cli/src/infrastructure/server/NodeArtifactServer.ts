import { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';
import type { ArtifactServer } from '#application/view/ports/ArtifactServer.js';
import type { ArtifactConfigurationChangeHandler } from '#application/view/ports/ArtifactConfigurationChangeHandler.js';
import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasConfigurationLoader } from '#application/configuration/ports/AtlasConfigurationLoader.js';
import type { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import {
  LayoutDocument,
  LayoutPosition,
  LayoutSettings,
  type LayoutOrientation
} from '#application/layout/model/LayoutDocument.js';
import { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import {
  DeclarationNode,
  DeclarationRelationship,
  type DeclarationNodeKind,
  type DeclarationRelationshipType
} from '#application/graph/model/DeclarationGraph.js';
import { createReadStream } from 'node:fs';
import { access, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Serves generated artifacts through a static HTTP server constrained to one resolved root directory.
 */
export class NodeArtifactServer implements ArtifactServer {
  /**
   * Holds the currently active local server while it owns a listener resource.
   */
  #server: Server | undefined;

  /**
   * Holds the one explicitly selected policy file that viewer actions may update while the server runs.
   */
  #configurationPath: string | undefined;

  /**
   * Holds the application refresh behavior for the currently served workspace.
   */
  #configurationChangeHandler: ArtifactConfigurationChangeHandler | undefined;

  /**
   * Creates a server that delegates generated placement to the application layout service.
   *
   * @param layoutService - Deterministic layout service shared with command-line layout generation.
   * @param configurationLoader - Validates changed policy documents before they replace the user-owned file.
   */
  public constructor(
    private readonly layoutService: DeterministicLayoutService,
    private readonly configurationLoader: AtlasConfigurationLoader
  ) {}

  /**
   * Starts a path-contained static server and resolves only once its listener is ready.
   *
   * @param artifactRootPath - Absolute artifact directory permitted for static file access.
   * @param host - Interface hostname or address to bind.
   * @param port - TCP port to bind. Zero requests an operating-system-selected port.
   * @param configurationPath - Absolute configured Atlas policy path permitted for explicit viewer actions.
   * @param configurationChangeHandler - Optional application callback that refreshes artifacts after a policy mutation.
   * @returns Active landscape location after the listener is ready.
   */
  public async start(
    artifactRootPath: string,
    host: string,
    port: number,
    configurationPath: string,
    configurationChangeHandler?: ArtifactConfigurationChangeHandler
  ): Promise<ArtifactServerLocation> {
    if (this.#server !== undefined) {
      throw new Error('Atlas artifact server is already active.');
    }
    const rootPath = resolve(artifactRootPath);
    await access(rootPath);
    await access(configurationPath);
    const server = createServer((request, response) => {
      void this.respond(rootPath, request, response);
    });
    try {
      const boundPort = await this.listen(server, host, port);
      this.#server = server;
      this.#configurationPath = resolve(configurationPath);
      this.#configurationChangeHandler = configurationChangeHandler;
      return new ArtifactServerLocation(`http://${host}:${boundPort}/landscape/index.html`);
    } catch (error: unknown) {
      server.close();
      throw error;
    }
  }

  /**
   * Stops the active server when it owns a listener and otherwise completes without side effects.
   *
   * @returns A promise that resolves once the listener resource has been released.
   */
  public stop(): Promise<void> {
    const server = this.#server;
    this.#server = undefined;
    this.#configurationPath = undefined;
    this.#configurationChangeHandler = undefined;
    if (server === undefined) {
      return Promise.resolve();
    }
    return new Promise((resolvePromise, rejectPromise) => {
      server.close((error) => {
        if (error === undefined) {
          resolvePromise();
          return;
        }
        rejectPromise(error);
      });
    });
  }

  /**
   * Binds an HTTP server and reports its concrete TCP port.
   *
   * @param server - Server to bind.
   * @param host - Interface hostname or address to bind.
   * @param port - TCP port to bind.
   * @returns Bound TCP port.
   */
  private listen(
    server: ReturnType<typeof createServer>,
    host: string,
    port: number
  ): Promise<number> {
    return new Promise((resolvePromise, rejectPromise) => {
      server.once('error', rejectPromise);
      server.listen(port, host, () => {
        const address = server.address();
        if (address === null || typeof address === 'string') {
          rejectPromise(new Error('Atlas local server did not expose a TCP address.'));
          return;
        }
        server.off('error', rejectPromise);
        resolvePromise(address.port);
      });
    });
  }

  /**
   * Routes one static-file request while rejecting unsafe paths and unsupported methods.
   *
   * @param rootPath - Absolute permitted artifact root.
   * @param request - Incoming Node HTTP request.
   * @param response - Mutable Node HTTP response.
   * @returns A promise that resolves once the response has been completed or streamed.
   */
  private async respond(
    rootPath: string,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    if (request.method === 'POST' && this.isLayoutSaveRequest(request.url ?? '/')) {
      await this.saveLayout(rootPath, request, response);
      return;
    }
    if (request.method === 'POST' && this.isLayoutGenerateRequest(request.url ?? '/')) {
      await this.generateLayout(rootPath, request, response);
      return;
    }
    if (request.method === 'POST' && this.isPngSaveRequest(request.url ?? '/')) {
      await this.savePng(rootPath, request, response);
      return;
    }
    if (request.method === 'POST' && this.isConfigurationActionRequest(request.url ?? '/')) {
      await this.applyConfigurationAction(request, response);
      return;
    }
    if (request.method === 'GET' && this.isConfigurationActionRequest(request.url ?? '/')) {
      await this.readConfigurationSummary(response);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      this.writeStatus(response, 405);
      return;
    }
    const artifactPath = this.resolveRequestPath(rootPath, request.url ?? '/');
    if (artifactPath === undefined) {
      this.writeStatus(response, 400);
      return;
    }
    try {
      const fileStats = await stat(artifactPath);
      if (!fileStats.isFile()) {
        this.writeStatus(response, 404);
        return;
      }
      response.writeHead(200, { 'Content-Type': this.contentType(artifactPath) });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      createReadStream(artifactPath).pipe(response);
    } catch {
      this.writeStatus(response, 404);
    }
  }

  /**
   * Determines whether one request selects the local layout persistence endpoint.
   *
   * @param requestUrl - Raw request URL.
   * @returns True only for the exact local layout save endpoint.
   */
  private isLayoutSaveRequest(requestUrl: string): boolean {
    try {
      return new URL(requestUrl, 'http://atlas.local').pathname === '/api/layout';
    } catch {
      return false;
    }
  }

  /**
   * Determines whether one request selects the deterministic server-side layout endpoint.
   *
   * @param requestUrl - Raw request URL.
   * @returns True only for the exact local layout generation endpoint.
   */
  private isLayoutGenerateRequest(requestUrl: string): boolean {
    try {
      return new URL(requestUrl, 'http://atlas.local').pathname === '/api/layout/generate';
    } catch {
      return false;
    }
  }

  /**
   * Determines whether one request selects the constrained configuration-action endpoint.
   *
   * @param requestUrl - Raw request URL.
   * @returns True only for the exact local configuration endpoint.
   */
  private isConfigurationActionRequest(requestUrl: string): boolean {
    try {
      return new URL(requestUrl, 'http://atlas.local').pathname === '/api/config';
    } catch {
      return false;
    }
  }

  /**
   * Applies one schema-safe diagram-policy action to the explicitly configured Atlas policy file.
   *
   * @param request - Incoming configuration-action request.
   * @param response - Mutable Node HTTP response.
   * @returns A promise that resolves after a validated atomic policy replacement.
   */
  private async applyConfigurationAction(
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const configurationPath = this.#configurationPath;
    if (configurationPath === undefined) {
      this.writeStatus(response, 409);
      return;
    }
    try {
      const action = this.readConfigurationAction(
        JSON.parse((await this.readBody(request)).toString('utf8'))
      );
      const originalText = await readFile(configurationPath, 'utf8');
      const configuration = JSON.parse(originalText) as unknown;
      if (action === undefined || !this.isConfigurationDocument(configuration)) {
        this.writeStatus(response, 400);
        return;
      }
      const updatedConfiguration = this.applyDiagramPolicyAction(configuration, action);
      await this.writeValidatedConfiguration(configurationPath, updatedConfiguration);
      try {
        await this.#configurationChangeHandler?.execute();
      } catch {
        await this.writeConfigurationTextAtomically(configurationPath, originalText);
        this.writeStatus(response, 400);
        return;
      }
      response.writeHead(204);
      response.end();
    } catch {
      this.writeStatus(response, 400);
    }
  }

  /**
   * Returns the globally configured diagram exclusions that the viewer may safely edit.
   *
   * @param response - Mutable HTTP response receiving the narrow configuration projection.
   * @returns A promise that resolves after the response has been completed.
   */
  private async readConfigurationSummary(response: ServerResponse): Promise<void> {
    const configurationPath = this.#configurationPath;
    if (configurationPath === undefined) {
      this.writeStatus(response, 409);
      return;
    }
    try {
      const configuration = JSON.parse(await readFile(configurationPath, 'utf8')) as unknown;
      if (!this.isConfigurationDocument(configuration)) {
        this.writeStatus(response, 400);
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(
        `${JSON.stringify({
          externalDependencies: configuration.diagrams?.excludeExternalDependencies ?? [],
          sourceGlobs: configuration.diagrams?.excludeSourceGlobs ?? [],
          splitExternalDependenciesByImporter:
            configuration.diagrams?.splitExternalDependenciesByImporter ?? false
        })}\n`
      );
    } catch {
      this.writeStatus(response, 400);
    }
  }

  /**
   * Narrows an untrusted payload to one approved diagram-policy mutation.
   *
   * @param value - Parsed browser request payload.
   * @returns Valid configuration action, or undefined when malformed or unsafe.
   */
  private readConfigurationAction(value: unknown): ConfigurationAction | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const action = value as Record<string, unknown>;
    if (
      (action.type === 'hide-external' || action.type === 'remove-external-exclusion') &&
      typeof action.value === 'string' &&
      action.value.length > 0
    ) {
      return new ConfigurationAction(action.type, action.value);
    }
    if (
      (action.type === 'hide-source' || action.type === 'remove-source-exclusion') &&
      typeof action.value === 'string' &&
      this.isSafeRelativePolicyPath(action.value)
    ) {
      return new ConfigurationAction(action.type, action.value);
    }
    if (action.type === 'set-external-splitting' && typeof action.enabled === 'boolean') {
      return new ConfigurationAction(action.type, action.enabled);
    }
    if (
      action.type === 'create-folder-diagram' &&
      typeof action.packageName === 'string' &&
      action.packageName.length > 0 &&
      typeof action.path === 'string' &&
      this.isSafeRelativePolicyPath(action.path) &&
      (typeof action.title === 'string' || action.title === undefined)
    ) {
      return new ConfigurationAction(action.type, {
        packageName: action.packageName,
        path: action.path,
        title: action.title
      });
    }
    return undefined;
  }

  /**
   * Rejects absolute and traversal-containing source or folder patterns submitted by a viewer.
   *
   * @param value - Candidate slash-normalized relative policy path.
   * @returns True when the path is non-empty and cannot escape a configured package or workspace.
   */
  private isSafeRelativePolicyPath(value: string): boolean {
    return (
      value.length > 0 &&
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !value.split('/').some((segment) => segment === '..' || segment.length === 0)
    );
  }

  /**
   * Determines whether parsed JSON has the minimum valid Atlas configuration document shape.
   *
   * @param value - Parsed user-owned configuration candidate.
   * @returns True when the document can be copied and mutated before full schema validation.
   */
  private isConfigurationDocument(value: unknown): value is AtlasConfiguration {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>).schemaVersion === 1 &&
      typeof (value as Record<string, unknown>).discovery === 'object' &&
      (value as Record<string, unknown>).discovery !== null
    );
  }

  /**
   * Applies one approved action without modifying unrelated policy sections.
   *
   * @param configuration - Existing minimally valid policy configuration.
   * @param action - Validated, narrowly scoped requested change.
   * @returns New configuration object ready for full schema validation.
   */
  private applyDiagramPolicyAction(
    configuration: AtlasConfiguration,
    action: ConfigurationAction
  ): AtlasConfiguration {
    const diagrams = { ...(configuration.diagrams ?? {}) };
    if (action.type === 'hide-external' || action.type === 'remove-external-exclusion') {
      const exclusions = this.updateStringList(
        diagrams.excludeExternalDependencies,
        action.value as string,
        action.type === 'hide-external'
      );
      if (exclusions === undefined) {
        delete diagrams.excludeExternalDependencies;
      } else {
        diagrams.excludeExternalDependencies = exclusions;
      }
    }
    if (action.type === 'hide-source' || action.type === 'remove-source-exclusion') {
      const exclusions = this.updateStringList(
        diagrams.excludeSourceGlobs,
        action.value as string,
        action.type === 'hide-source'
      );
      if (exclusions === undefined) {
        delete diagrams.excludeSourceGlobs;
      } else {
        diagrams.excludeSourceGlobs = exclusions;
      }
    }
    if (action.type === 'set-external-splitting') {
      diagrams.splitExternalDependenciesByImporter = action.value as boolean;
    }
    if (action.type === 'create-folder-diagram') {
      const folder = action.value as ConfigurationFolder;
      const folders = [...(diagrams.folders ?? [])].filter(
        (candidate) =>
          !(candidate.packageName === folder.packageName && candidate.path === folder.path)
      );
      folders.push({
        packageName: folder.packageName,
        path: folder.path,
        ...(folder.title === undefined || folder.title.length === 0 ? {} : { title: folder.title })
      });
      diagrams.folders = folders.sort((left, right) =>
        `${left.packageName}/${left.path}`.localeCompare(`${right.packageName}/${right.path}`)
      );
    }
    return { ...configuration, diagrams };
  }

  /**
   * Adds or removes one value from a canonical policy list.
   *
   * @param values - Existing optional policy values.
   * @param value - Valid requested value.
   * @param add - Determines whether the value is added or removed.
   * @returns Sorted unique list, or undefined when removal leaves it empty.
   */
  private updateStringList(
    values: readonly string[] | undefined,
    value: string,
    add: boolean
  ): readonly string[] | undefined {
    const updated = new Set(values ?? []);
    if (add) {
      updated.add(value);
    } else {
      updated.delete(value);
    }
    const sorted = [...updated].sort((left, right) => left.localeCompare(right));
    return sorted.length === 0 ? undefined : sorted;
  }

  /**
   * Validates one changed policy through the canonical loader before replacing the original atomically.
   *
   * @param configurationPath - Absolute explicitly configured policy file path.
   * @param configuration - Candidate updated policy configuration.
   * @returns A promise that resolves after schema validation and atomic replacement.
   */
  private async writeValidatedConfiguration(
    configurationPath: string,
    configuration: AtlasConfiguration
  ): Promise<void> {
    const temporaryPath = `${configurationPath}.tmp-${process.pid}`;
    try {
      await writeFile(temporaryPath, `${JSON.stringify(configuration, undefined, 2)}\n`, 'utf8');
      await this.configurationLoader.load(temporaryPath);
      await rename(temporaryPath, configurationPath);
    } catch (error: unknown) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  /** Restores an already validated user-owned configuration when regeneration rejects a mutation. */
  private async writeConfigurationTextAtomically(
    configurationPath: string,
    text: string
  ): Promise<void> {
    const temporaryPath = `${configurationPath}.tmp-${process.pid}`;
    try {
      await writeFile(temporaryPath, text, 'utf8');
      await rename(temporaryPath, configurationPath);
    } catch (error: unknown) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  /**
   * Runs the shared deterministic placement algorithm and atomically replaces one scope layout.
   *
   * @param rootPath - Absolute permitted artifact root.
   * @param request - Incoming layout-generation request.
   * @param response - Mutable Node HTTP response.
   * @returns A promise that resolves after writing the generated layout response.
   */
  private async generateLayout(
    rootPath: string,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const scope = this.readScope(request.url ?? '/');
    const scopeDirectoryPath =
      scope === undefined ? undefined : this.resolveScopeDirectoryPath(rootPath, scope);
    if (scopeDirectoryPath === undefined) {
      this.writeStatus(response, 400);
      return;
    }
    try {
      const graph = this.readDiagramGraph(
        JSON.parse(await readFile(resolve(scopeDirectoryPath, 'graph.json'), 'utf8'))
      );
      const settings = this.readLayoutSettings(
        JSON.parse((await this.readBody(request)).toString('utf8'))
      );
      const savedLayout = await this.readSavedLayout(resolve(scopeDirectoryPath, 'layout.json'));
      if (graph === undefined || settings === undefined || graph.scope !== scope) {
        this.writeStatus(response, 400);
        return;
      }
      const layout = this.layoutService.layout(graph, savedLayout, settings);
      await this.writeLayout(resolve(scopeDirectoryPath, 'layout.json'), layout);
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(`${JSON.stringify(this.toLayoutPayload(layout), undefined, 2)}\n`);
    } catch {
      this.writeStatus(response, 400);
    }
  }

  /**
   * Determines whether one request selects the local PNG persistence endpoint.
   *
   * @param requestUrl - Raw request URL.
   * @returns True only for the exact local PNG save endpoint.
   */
  private isPngSaveRequest(requestUrl: string): boolean {
    try {
      return new URL(requestUrl, 'http://atlas.local').pathname === '/api/png';
    } catch {
      return false;
    }
  }

  /**
   * Cleans and atomically persists user-supplied layout state against a generated graph scope.
   *
   * @param rootPath - Absolute permitted artifact root.
   * @param request - Incoming layout persistence request.
   * @param response - Mutable Node HTTP response.
   * @returns A promise that resolves after writing the response.
   */
  private async saveLayout(
    rootPath: string,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const scope = this.readScope(request.url ?? '/');
    if (scope === undefined) {
      this.writeStatus(response, 400);
      return;
    }
    const scopeDirectoryPath = this.resolveScopeDirectoryPath(rootPath, scope);
    if (scopeDirectoryPath === undefined) {
      this.writeStatus(response, 400);
      return;
    }
    try {
      const graph = this.readGraphDocument(
        JSON.parse(await readFile(resolve(scopeDirectoryPath, 'graph.json'), 'utf8'))
      );
      const layout = this.readLayoutDocument(
        JSON.parse((await this.readBody(request)).toString('utf8'))
      );
      if (graph === undefined || layout === undefined) {
        this.writeStatus(response, 400);
        return;
      }
      const cleanedLayout = this.cleanLayout(graph, layout);
      const layoutPath = resolve(scopeDirectoryPath, 'layout.json');
      const temporaryPath = `${layoutPath}.tmp-${process.pid}`;
      await writeFile(temporaryPath, `${JSON.stringify(cleanedLayout, undefined, 2)}\n`, 'utf8');
      await rename(temporaryPath, layoutPath);
      response.writeHead(204);
      response.end();
    } catch {
      this.writeStatus(response, 400);
    }
  }

  /**
   * Validates and atomically persists a PNG export beside the matching generated graph scope.
   *
   * @param rootPath - Absolute permitted artifact root.
   * @param request - Incoming PNG persistence request.
   * @param response - Mutable Node HTTP response.
   * @returns A promise that resolves after writing the response.
   */
  private async savePng(
    rootPath: string,
    request: IncomingMessage,
    response: ServerResponse
  ): Promise<void> {
    const scope = this.readScope(request.url ?? '/');
    const scopeDirectoryPath =
      scope === undefined ? undefined : this.resolveScopeDirectoryPath(rootPath, scope);
    if (
      scopeDirectoryPath === undefined ||
      !request.headers['content-type']?.toLocaleLowerCase().startsWith('image/png')
    ) {
      this.writeStatus(response, 400);
      return;
    }
    try {
      const graphStats = await stat(resolve(scopeDirectoryPath, 'graph.json'));
      const image = await this.readBody(request, 25 * 1024 * 1024);
      if (!graphStats.isFile() || !this.isPng(image)) {
        this.writeStatus(response, 400);
        return;
      }
      const imagePath = resolve(scopeDirectoryPath, 'diagram.png');
      const temporaryPath = `${imagePath}.tmp-${process.pid}`;
      await writeFile(temporaryPath, image);
      await rename(temporaryPath, imagePath);
      response.writeHead(204);
      response.end();
    } catch {
      this.writeStatus(response, 400);
    }
  }

  /**
   * Reads a schema-valid scope query parameter without accepting encoded traversal segments.
   *
   * @param requestUrl - Raw request URL.
   * @returns Stable supported scope or undefined for malformed input.
   */
  private readScope(requestUrl: string): string | undefined {
    try {
      const scope = new URL(requestUrl, 'http://atlas.local').searchParams.get('scope');
      if (
        scope === null ||
        scope.includes('..') ||
        scope.includes('\\') ||
        (!scope.startsWith('landscape') &&
          !scope.startsWith('package:') &&
          !scope.startsWith('group:') &&
          !scope.startsWith('folder:'))
      ) {
        return undefined;
      }
      return scope;
    } catch {
      return undefined;
    }
  }

  /**
   * Maps one validated scope identifier to its contained generated artifact directory.
   *
   * @param rootPath - Absolute permitted artifact root.
   * @param scope - Validated scope identity.
   * @returns Contained scope path or undefined when the scope form is unsupported.
   */
  private resolveScopeDirectoryPath(rootPath: string, scope: string): string | undefined {
    const childPath =
      scope === 'landscape'
        ? 'landscape'
        : scope.startsWith('package:')
          ? `packages/${encodeURIComponent(scope.slice('package:'.length))}`
          : scope.startsWith('group:')
            ? `groups/${encodeURIComponent(scope.slice('group:'.length))}`
            : scope.startsWith('folder:')
              ? `folders/${encodeURIComponent(scope.slice('folder:'.length))}`
              : undefined;
    return childPath === undefined ? undefined : this.resolveRequestPath(rootPath, `/${childPath}`);
  }

  /**
   * Reads a bounded request body to avoid unbounded local-server memory use.
   *
   * @param request - Incoming Node HTTP request.
   * @param maximumBytes - Inclusive maximum accepted body size for the calling endpoint.
   * @returns Complete binary request body.
   */
  private readBody(request: IncomingMessage, maximumBytes = 1024 * 1024): Promise<Buffer> {
    return new Promise((resolvePromise, rejectPromise) => {
      const chunks: Buffer[] = [];
      let length = 0;
      request.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > maximumBytes) {
          rejectPromise(new Error('Atlas layout request body exceeds one megabyte.'));
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      request.once('error', rejectPromise);
      request.once('end', () => resolvePromise(Buffer.concat(chunks)));
    });
  }

  /**
   * Verifies a binary request body starts with the PNG file signature.
   *
   * @param value - Candidate binary image data.
   * @returns True when the content has a valid PNG signature.
   */
  private isPng(value: Buffer): boolean {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    return (
      value.length >= signature.length && signature.every((byte, index) => value[index] === byte)
    );
  }

  /**
   * Narrows graph JSON to the fields required for layout cleanup.
   *
   * @param value - Parsed graph JSON.
   * @returns Graph node parent metadata and relationship identifiers, or undefined when malformed.
   */
  private readGraphDocument(value: unknown): LayoutGraph | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const elements = (value as Record<string, unknown>).elements;
    if (typeof elements !== 'object' || elements === null) {
      return undefined;
    }
    const nodes = (elements as Record<string, unknown>).nodes;
    const edges = (elements as Record<string, unknown>).edges;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return undefined;
    }
    const liveNodes = nodes
      .map((entry) => this.readGraphNode(entry))
      .filter((entry): entry is LayoutGraphNode => entry !== undefined)
      .filter((entry) => !entry.compound);
    const relationshipIds = edges
      .map((entry) => this.readGraphEdgeId(entry))
      .filter((entry): entry is string => entry !== undefined);
    return new LayoutGraph(liveNodes, relationshipIds);
  }

  /**
   * Reconstructs an application diagram graph from a generated Cytoscape document.
   *
   * @param value - Parsed generated graph document.
   * @returns Diagram graph suitable for deterministic layout, or undefined when malformed.
   */
  private readDiagramGraph(value: unknown): DiagramGraph | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const document = value as Record<string, unknown>;
    if (
      !this.isDiagramScope(document.scope) ||
      typeof document.title !== 'string' ||
      typeof document.elements !== 'object' ||
      document.elements === null
    ) {
      return undefined;
    }
    const elements = document.elements as Record<string, unknown>;
    if (!Array.isArray(elements.nodes) || !Array.isArray(elements.edges)) {
      return undefined;
    }
    const nodes = elements.nodes
      .filter((entry) => this.readGraphNode(entry)?.compound !== true)
      .map((entry) => this.readDeclarationNode(entry));
    const relationships = elements.edges.map((entry) => this.readDeclarationRelationship(entry));
    if (
      nodes.some((node) => node === undefined) ||
      relationships.some((relationship) => relationship === undefined)
    ) {
      return undefined;
    }
    return new DiagramGraph(
      document.scope,
      document.title,
      nodes as readonly DeclarationNode[],
      relationships as readonly DeclarationRelationship[]
    );
  }

  /**
   * Determines whether a serialized graph scope matches a supported Atlas scope form.
   *
   * @param value - Candidate serialized scope.
   * @returns True when the scope identifies a generated diagram kind.
   */
  private isDiagramScope(value: unknown): value is DiagramGraph['scope'] {
    return (
      typeof value === 'string' &&
      (value === 'landscape' ||
        value.startsWith('package:') ||
        value.startsWith('group:') ||
        value.startsWith('folder:'))
    );
  }

  /**
   * Reads one fully described non-compound declaration node from generated graph JSON.
   *
   * @param value - Parsed Cytoscape node element.
   * @returns Application declaration node, or undefined when required fields are malformed.
   */
  private readDeclarationNode(value: unknown): DeclarationNode | undefined {
    const data = this.readData(value);
    if (
      data === undefined ||
      data.compound === true ||
      typeof data.id !== 'string' ||
      typeof data.label !== 'string' ||
      !this.isDeclarationNodeKind(data.kind) ||
      (typeof data.packageName !== 'string' && data.packageName !== undefined) ||
      (typeof data.sourcePath !== 'string' && data.sourcePath !== undefined) ||
      typeof data.moduleNode !== 'boolean'
    ) {
      return undefined;
    }
    return new DeclarationNode(
      data.id,
      data.label,
      data.kind,
      data.packageName,
      data.sourcePath,
      data.moduleNode
    );
  }

  /**
   * Reads one semantic relationship from generated graph JSON.
   *
   * @param value - Parsed Cytoscape edge element.
   * @returns Application relationship, or undefined when required fields are malformed.
   */
  private readDeclarationRelationship(value: unknown): DeclarationRelationship | undefined {
    const data = this.readData(value);
    if (
      data === undefined ||
      typeof data.id !== 'string' ||
      typeof data.source !== 'string' ||
      typeof data.target !== 'string' ||
      !this.isRelationshipType(data.relationshipType)
    ) {
      return undefined;
    }
    return new DeclarationRelationship(data.id, data.source, data.target, data.relationshipType);
  }

  /**
   * Determines whether a graph-node kind is supported by the semantic model.
   *
   * @param value - Candidate generated node kind.
   * @returns True when the kind can construct a declaration node.
   */
  private isDeclarationNodeKind(value: unknown): value is DeclarationNodeKind {
    return (
      value === 'class' ||
      value === 'interface' ||
      value === 'type-alias' ||
      value === 'enum' ||
      value === 'module' ||
      value === 'external'
    );
  }

  /**
   * Determines whether a graph-edge relationship type is supported by the semantic model.
   *
   * @param value - Candidate generated relationship type.
   * @returns True when the type can construct a declaration relationship.
   */
  private isRelationshipType(value: unknown): value is DeclarationRelationshipType {
    return value === 'reference' || value === 'inheritance';
  }

  /**
   * Reads compatible saved layout state when present and ignores missing or malformed artifacts.
   *
   * @param layoutPath - Absolute contained layout artifact path.
   * @returns Compatible application layout document, or undefined when none can be used.
   */
  private async readSavedLayout(layoutPath: string): Promise<LayoutDocument | undefined> {
    try {
      const payload = this.readLayoutDocument(JSON.parse(await readFile(layoutPath, 'utf8')));
      return payload === undefined
        ? undefined
        : new LayoutDocument(
            1,
            payload.positions.map(
              (position) =>
                new LayoutPosition(position.nodeId, position.parentId, position.x, position.y)
            ),
            payload.hiddenRelationshipIds
          );
    } catch {
      return undefined;
    }
  }

  /**
   * Validates optional browser layout controls over documented Atlas defaults.
   *
   * @param value - Parsed browser request payload.
   * @returns Complete layout settings, or undefined when settings are malformed.
   */
  private readLayoutSettings(value: unknown): LayoutSettings | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const settings = value as Record<string, unknown>;
    const orientation: LayoutOrientation | undefined =
      settings.orientation === undefined
        ? 'horizontal'
        : settings.orientation === 'horizontal' || settings.orientation === 'vertical'
          ? settings.orientation
          : undefined;
    const rows = settings.rows === undefined ? 6 : settings.rows;
    const horizontalGap = settings.horizontalGap === undefined ? 80 : settings.horizontalGap;
    const verticalGap = settings.verticalGap === undefined ? 60 : settings.verticalGap;
    const force = settings.force === undefined ? false : settings.force;
    if (
      orientation === undefined ||
      typeof rows !== 'number' ||
      !Number.isInteger(rows) ||
      rows <= 0 ||
      typeof horizontalGap !== 'number' ||
      !Number.isFinite(horizontalGap) ||
      horizontalGap < 0 ||
      typeof verticalGap !== 'number' ||
      !Number.isFinite(verticalGap) ||
      verticalGap < 0 ||
      typeof force !== 'boolean'
    ) {
      return undefined;
    }
    return new LayoutSettings(orientation, rows, horizontalGap, verticalGap, force);
  }

  /**
   * Atomically writes a canonical application layout document under the generated scope.
   *
   * @param layoutPath - Absolute contained destination layout file.
   * @param layout - Generated layout document to persist.
   * @returns A promise that resolves after replacement completes.
   */
  private async writeLayout(layoutPath: string, layout: LayoutDocument): Promise<void> {
    const temporaryPath = `${layoutPath}.tmp-${process.pid}`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(this.toLayoutPayload(layout), undefined, 2)}\n`,
      'utf8'
    );
    await rename(temporaryPath, layoutPath);
  }

  /**
   * Converts an application layout document to its persisted JSON shape.
   *
   * @param layout - Canonical layout document.
   * @returns Serializable layout payload with canonical field names.
   */
  private toLayoutPayload(layout: LayoutDocument): Record<string, unknown> {
    return {
      hiddenRelationshipIds: layout.hiddenRelationshipIds,
      positions: layout.positions,
      schemaVersion: layout.schemaVersion
    };
  }

  /**
   * Reads one graph node layout identity from untrusted graph JSON.
   *
   * @param value - Parsed graph node candidate.
   * @returns Normalized graph node metadata, or undefined when malformed.
   */
  private readGraphNode(value: unknown): LayoutGraphNode | undefined {
    const data = this.readData(value);
    if (data === undefined || typeof data.id !== 'string') {
      return undefined;
    }
    return new LayoutGraphNode(
      data.id,
      typeof data.parent === 'string' ? data.parent : undefined,
      data.compound === true
    );
  }

  /**
   * Reads one graph edge identifier from untrusted graph JSON.
   *
   * @param value - Parsed graph edge candidate.
   * @returns Edge ID, or undefined when malformed.
   */
  private readGraphEdgeId(value: unknown): string | undefined {
    const data = this.readData(value);
    return data !== undefined && typeof data.id === 'string' ? data.id : undefined;
  }

  /**
   * Extracts a data record from a Cytoscape-compatible element candidate.
   *
   * @param value - Parsed graph element candidate.
   * @returns Data record, or undefined when malformed.
   */
  private readData(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const data = (value as Record<string, unknown>).data;
    return typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : undefined;
  }

  /**
   * Narrows an untrusted persisted layout payload to its supported schema representation.
   *
   * @param value - Parsed layout JSON.
   * @returns Parsed layout document, or undefined when malformed.
   */
  private readLayoutDocument(value: unknown): LayoutPayload | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const document = value as Record<string, unknown>;
    if (
      document.schemaVersion !== 1 ||
      !Array.isArray(document.positions) ||
      !Array.isArray(document.hiddenRelationshipIds)
    ) {
      return undefined;
    }
    const positions = document.positions
      .map((position) => this.readLayoutPosition(position))
      .filter((position): position is LayoutPayloadPosition => position !== undefined);
    if (
      positions.length !== document.positions.length ||
      !document.hiddenRelationshipIds.every((id) => typeof id === 'string')
    ) {
      return undefined;
    }
    return new LayoutPayload(positions, document.hiddenRelationshipIds);
  }

  /**
   * Reads one persisted node position candidate.
   *
   * @param value - Parsed position candidate.
   * @returns Parsed finite position, or undefined when malformed.
   */
  private readLayoutPosition(value: unknown): LayoutPayloadPosition | undefined {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    const position = value as Record<string, unknown>;
    if (
      typeof position.nodeId !== 'string' ||
      (typeof position.parentId !== 'string' && position.parentId !== undefined) ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      return undefined;
    }
    return new LayoutPayloadPosition(position.nodeId, position.parentId, position.x, position.y);
  }

  /**
   * Retains only current graph positions with matching parent IDs and current hidden relationship IDs.
   *
   * @param graph - Current generated graph metadata.
   * @param layout - User-supplied layout payload.
   * @returns Canonically ordered, cleaned persisted layout document.
   */
  private cleanLayout(graph: LayoutGraph, layout: LayoutPayload): Record<string, unknown> {
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const positions = layout.positions
      .filter((position) => {
        const node = nodesById.get(position.nodeId);
        return node !== undefined && node.parentId === position.parentId;
      })
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
      .map((position) => ({
        nodeId: position.nodeId,
        parentId: position.parentId,
        x: Math.round(position.x * 1000) / 1000,
        y: Math.round(position.y * 1000) / 1000
      }));
    const edgeIds = new Set(graph.relationshipIds);
    const hiddenRelationshipIds = [...new Set(layout.hiddenRelationshipIds)]
      .filter((relationshipId) => edgeIds.has(relationshipId))
      .sort((left, right) => left.localeCompare(right));
    return { hiddenRelationshipIds, positions, schemaVersion: 1 };
  }

  /**
   * Resolves a URL pathname into a verified artifact-root-contained file path.
   *
   * @param rootPath - Absolute permitted artifact root.
   * @param requestUrl - Raw request URL.
   * @returns Contained file path, or undefined for malformed and escaping paths.
   */
  private resolveRequestPath(rootPath: string, requestUrl: string): string | undefined {
    try {
      const pathname = new URL(requestUrl, 'http://atlas.local').pathname;
      const decodedPath = decodeURIComponent(pathname);
      const decodedRelativePath =
        decodedPath === '/' ? 'landscape/index.html' : decodedPath.slice(1);
      if (decodedRelativePath.split('/').some((segment) => segment === '..' || segment.length === 0)) {
        return undefined;
      }
      const relativePath = pathname === '/' ? 'landscape/index.html' : pathname.slice(1);
      const resolvedPath = resolve(rootPath, relativePath);
      const containedPath = relative(rootPath, resolvedPath);
      if (
        containedPath === '..' ||
        containedPath.startsWith(`..${sep}`) ||
        isAbsolute(containedPath)
      ) {
        return undefined;
      }
      return resolvedPath;
    } catch {
      return undefined;
    }
  }

  /**
   * Writes an empty HTTP error response without leaking filesystem details.
   *
   * @param response - Mutable Node HTTP response.
   * @param statusCode - HTTP status code to send.
   */
  private writeStatus(response: ServerResponse, statusCode: number): void {
    response.writeHead(statusCode);
    response.end();
  }

  /**
   * Determines a safe basic content type for generated static artifact files.
   *
   * @param artifactPath - Absolute artifact file path.
   * @returns HTTP content type for the file extension.
   */
  private contentType(artifactPath: string): string {
    if (artifactPath.endsWith('.html')) {
      return 'text/html; charset=utf-8';
    }
    if (artifactPath.endsWith('.json')) {
      return 'application/json; charset=utf-8';
    }
    if (artifactPath.endsWith('.js')) {
      return 'text/javascript; charset=utf-8';
    }
    if (artifactPath.endsWith('.css')) {
      return 'text/css; charset=utf-8';
    }
    if (artifactPath.endsWith('.png')) {
      return 'image/png';
    }
    return 'application/octet-stream';
  }
}

/**
 * Captures current graph metadata needed to clean a browser-submitted layout document.
 */
class LayoutGraph {
  /**
   * Creates graph metadata from live leaf nodes and relationship identifiers.
   *
   * @param nodes - Current non-compound graph nodes.
   * @param relationshipIds - Current graph relationship identifiers.
   */
  public constructor(
    public readonly nodes: readonly LayoutGraphNode[],
    public readonly relationshipIds: readonly string[]
  ) {}
}

/**
 * Identifies one current graph node and its expected compound parent.
 */
class LayoutGraphNode {
  /**
   * Creates live graph node layout metadata.
   *
   * @param id - Stable graph node identifier.
   * @param parentId - Expected compound parent identifier, when present.
   * @param compound - Determines whether the graph node is a compound container.
   */
  public constructor(
    public readonly id: string,
    public readonly parentId: string | undefined,
    public readonly compound: boolean
  ) {}
}

/**
 * Captures a parsed browser-submitted layout document before graph cleanup.
 */
class LayoutPayload {
  /**
   * Creates a parsed layout payload.
   *
   * @param positions - Parsed finite node positions.
   * @param hiddenRelationshipIds - Requested hidden relationship identifiers.
   */
  public constructor(
    public readonly positions: readonly LayoutPayloadPosition[],
    public readonly hiddenRelationshipIds: readonly string[]
  ) {}
}

/**
 * Represents one parsed finite browser-submitted node position.
 */
class LayoutPayloadPosition {
  /**
   * Creates one parsed browser-submitted node position.
   *
   * @param nodeId - Stable target graph node identifier.
   * @param parentId - Expected compound parent identifier, when present.
   * @param x - Finite absolute horizontal coordinate.
   * @param y - Finite absolute vertical coordinate.
   */
  public constructor(
    public readonly nodeId: string,
    public readonly parentId: string | undefined,
    public readonly x: number,
    public readonly y: number
  ) {}
}

/**
 * Captures one validated viewer-requested diagram-policy mutation.
 */
class ConfigurationAction {
  /**
   * Creates an approved narrow configuration mutation.
   *
   * @param type - Supported policy mutation kind.
   * @param value - Valid action payload appropriate for the selected mutation type.
   */
  public constructor(
    public readonly type: ConfigurationActionType,
    public readonly value: string | boolean | ConfigurationFolder
  ) {}
}

/**
 * Identifies a constrained diagram-policy field mutation supported by the local viewer server.
 */
type ConfigurationActionType =
  | 'hide-external'
  | 'remove-external-exclusion'
  | 'hide-source'
  | 'remove-source-exclusion'
  | 'set-external-splitting'
  | 'create-folder-diagram';

/**
 * Describes the validated package-local folder identity used to create an opt-in diagram.
 */
class ConfigurationFolder {
  /**
   * Creates a folder-diagram policy identity.
   *
   * @param packageName - Explicit configured package name owning the folder.
   * @param path - Slash-normalized folder path relative to that package root.
   * @param title - Optional non-empty title override.
   */
  public constructor(
    public readonly packageName: string,
    public readonly path: string,
    public readonly title: string | undefined
  ) {}
}

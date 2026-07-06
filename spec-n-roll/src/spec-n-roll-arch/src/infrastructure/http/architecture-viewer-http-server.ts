import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { Logger } from 'tslog';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';

/**
 * Defines the schema version accepted by checked-in architecture diagram layouts.
 */
const ARCHITECTURE_LAYOUT_VERSION = 2;

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
 * Describes one persisted node position in Cytoscape model coordinates.
 */
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
    const server = createServer((request, response) => {
      void this.handleRequest(request, response, artifactRoot);
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
  ): Promise<void> {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (
        request.method === 'PUT' &&
        url.pathname === '/__spec-n-roll/layout'
      ) {
        await this.persistLayout(request, response, artifactRoot, url);
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
      url.pathname === '/'
        ? 'project-dependencies.cytoscape.html'
        : url.pathname.slice(1);
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

  private async readElements(jsonPath: string): Promise<CytoscapeElement[]> {
    const parsed = JSON.parse(await readFile(jsonPath, 'utf8'));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as CytoscapeElement[];
  }

  private async readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return null;
    }
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

    return { version: ARCHITECTURE_LAYOUT_VERSION, nodes };
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

  private isPersistedArchitectureLayout(
    layout: unknown,
  ): layout is PersistedArchitectureLayout {
    if (!layout || typeof layout !== 'object') {
      return false;
    }

    const candidate = layout as {
      version?: unknown;
      nodes?: unknown;
    };

    return (
      candidate.version === ARCHITECTURE_LAYOUT_VERSION &&
      !!candidate.nodes &&
      typeof candidate.nodes === 'object' &&
      Object.values(candidate.nodes).every((nodeLayout) =>
        this.isPersistedNodeLayout(nodeLayout),
      )
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

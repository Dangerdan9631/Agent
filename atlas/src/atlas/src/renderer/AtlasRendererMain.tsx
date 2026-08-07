import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { Component, StrictMode } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Loads generated Atlas graph data and hosts the desktop renderer surface.
 */
class AtlasRendererApplication extends Component<object, AtlasRendererState> {
  /** Holds the graph container used by Cytoscape after React mounts it. */
  private graphContainer: HTMLDivElement | null = null;

  /** Holds the active Cytoscape graph so stale instances can be disposed safely. */
  private graph: Core | undefined;

  /** Initializes the renderer before the generated landscape graph is loaded. */
  public override state: AtlasRendererState = {};

  /** Loads the selected landscape after the renderer has an interactive document surface. */
  public override componentDidMount(): void {
    void window.atlas.loadLandscape()
      .then((landscape) => this.setState({ landscape }))
      .catch((error: unknown) =>
        this.setState({ error: error instanceof Error ? error.message : 'Atlas could not load a diagram.' })
      );
  }

  /** Creates the Cytoscape visualization whenever a generated graph has been loaded. */
  public override componentDidUpdate(_: object, previousState: AtlasRendererState): void {
    if (this.state.landscape !== previousState.landscape && this.state.landscape !== undefined) {
      this.renderGraph();
    }
  }

  /** Disposes the graph engine when the renderer window closes. */
  public override componentWillUnmount(): void {
    this.graph?.destroy();
  }

  /** Renders loading, failure, and generated-diagram states. */
  public override render(): ReactElement {
    const landscape = this.state.landscape;
    return (
      <main style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh' }}>
        <header style={{ borderBottom: '1px solid #cbd5e1', padding: '1rem 1.25rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{landscape?.graph.title ?? 'Atlas'}</h1>
          {landscape === undefined && this.state.error === undefined ? <p>Loading architecture…</p> : null}
          {this.state.error === undefined ? null : <p role="alert">{this.state.error}</p>}
        </header>
        <div
          ref={(element) => {
            this.graphContainer = element;
          }}
          aria-label="Architecture diagram"
          role="img"
          style={{ minHeight: 0 }}
        />
      </main>
    );
  }

  /** Builds a local Cytoscape graph from the generated portable element arrays. */
  private renderGraph(): void {
    if (this.graphContainer === null || this.state.landscape === undefined) {
      return;
    }
    this.graph?.destroy();
    this.graph = cytoscape({
      container: this.graphContainer,
      elements: [
        ...this.state.landscape.graph.elements.nodes,
        ...this.state.landscape.graph.elements.edges
      ] as ElementDefinition[],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#2563eb',
            color: '#0f172a',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'font-size': 11
          }
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],
      layout: { name: 'breadthfirst', directed: true, padding: 36 }
    });
  }
}

/**
 * Holds generated graph state and any user-visible loading failure.
 */
interface AtlasRendererState {
  /** Loaded generated landscape graph when configuration resolution succeeds. */
  readonly landscape?: Awaited<ReturnType<Window['atlas']['loadLandscape']>>;
  /** Human-readable desktop loading failure. */
  readonly error?: string;
}

/**
 * Mounts the isolated desktop renderer into the built Electron document.
 */
class AtlasRendererHost {
  /** Mounts the root React renderer onto the required document element. */
  public mount(): void {
    const rootElement = document.getElementById('root');
    if (rootElement === null) {
      throw new Error('Atlas desktop requires the renderer root element.');
    }
    createRoot(rootElement).render(
      <StrictMode>
        <AtlasRendererApplication />
      </StrictMode>
    );
  }
}

new AtlasRendererHost().mount();

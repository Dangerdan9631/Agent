import { contextBridge, ipcRenderer } from 'electron';
import type { AtlasLandscapeDocument } from '#main/AtlasArtifactLoader.js';

/**
 * Defines the only artifact-reading capability granted to the sandboxed renderer.
 */
interface AtlasDesktopApi {
  /**
   * Loads the configured generated landscape graph through the main process.
   *
   * @returns Parsed landscape graph and non-sensitive path metadata.
   */
  loadLandscape(): Promise<AtlasLandscapeDocument>;
}

/**
 * Exposes the validated desktop API without exposing Electron or Node.js globals.
 */
class AtlasPreloadBridge {
  /**
   * Registers the narrow renderer API using Electron's isolated context bridge.
   */
  public register(): void {
    const api: AtlasDesktopApi = {
      loadLandscape: () => ipcRenderer.invoke('atlas:load-landscape') as Promise<AtlasLandscapeDocument>
    };
    contextBridge.exposeInMainWorld('atlas', api);
  }
}

new AtlasPreloadBridge().register();

declare global {
  /**
   * Exposes Atlas desktop capabilities inside the renderer's isolated global scope.
   */
  interface Window {
    /** Narrow desktop API supplied by the preload bridge. */
    readonly atlas: AtlasDesktopApi;
  }
}

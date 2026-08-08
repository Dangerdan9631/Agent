import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AtlasArtifactLoader } from '#main/AtlasArtifactLoader.js';

/**
 * Composes the secured Electron desktop process and its narrow artifact-reading IPC boundary.
 */
class AtlasDesktopApplication {
  /**
   * Creates the desktop application from an injected filesystem-backed artifact loader.
   *
   * @param artifactLoader Resolves configuration and generated graph data for the renderer.
   */
  public constructor(private readonly artifactLoader: AtlasArtifactLoader) {}

  /**
   * Starts Electron after registering process-local IPC handlers.
   */
  public async start(): Promise<void> {
    await app.whenReady();
    this.registerHandlers();
    await this.createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void this.createWindow();
      }
    });
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  /**
   * Registers renderer requests that expose only parsed generated graph data.
   */
  private registerHandlers(): void {
    ipcMain.handle('atlas:load-landscape', async () =>
      this.artifactLoader.loadLandscape(this.configurationPath())
    );
  }

  /**
   * Creates one sandboxed desktop window for the built renderer bundle.
   */
  private async createWindow(): Promise<void> {
    const directoryPath = dirname(fileURLToPath(import.meta.url));
    const window = new BrowserWindow({
      width: 1440,
      height: 960,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: resolve(directoryPath, '../preload/AtlasPreload.js')
      }
    });
    await window.loadFile(resolve(directoryPath, '../../renderer/index.html'));
  }

  /**
   * Resolves the requested config path or the current workspace default.
   *
   * @returns Existing user-owned Atlas configuration path.
   */
  private configurationPath(): string {
    const explicitPath = process.argv.slice(1).find((argument) => argument.endsWith('.json'));
    const path = resolve(explicitPath ?? resolve(process.cwd(), 'atlas.config.json'));
    if (!existsSync(path)) {
      throw new Error(`Atlas desktop could not find configuration '${path}'.`);
    }
    return path;
  }
}

void new AtlasDesktopApplication(new AtlasArtifactLoader()).start();

import { app, BrowserWindow } from 'electron';
import { AtlasCompositionRoot } from '@starcruisestudios/atlas-cli/composition';
import type { AtlasArtifactHost } from '@starcruisestudios/atlas-cli/artifact-host';
import type { AtlasArtifactHostOptions } from '@starcruisestudios/atlas-cli/artifact-host-options';
import { AtlasDesktopArgumentParser } from '#main/AtlasDesktopArgumentParser.js';

/**
 * Owns the Electron window and the constrained local artifact server used by the desktop viewer.
 */
class AtlasDesktopApplication {
  /** Holds the current artifact URL so macOS activation can recreate a closed window. */
  private artifactUrl: string | undefined;

  /** Prevents the asynchronous server shutdown from recursively intercepting application quit. */
  private stopped = false;

  /** Retains the in-flight server shutdown so repeated quit requests share one completion. */
  private stopping: Promise<void> | undefined;

  /**
   * Creates the desktop application from its hosted-viewer and command-line boundaries.
   *
   * @param artifactHost - Serves generated portable artifacts through the legacy-compatible viewer surface.
   * @param argumentParser - Validates desktop and legacy view arguments.
   */
  public constructor(
    private readonly artifactHost: AtlasArtifactHost,
    private readonly argumentParser: AtlasDesktopArgumentParser
  ) {}

  /**
   * Starts the local artifact host and opens its full interaction surface in a secured Electron window.
   *
   * @param argumentsToParse - Arguments supplied after the Electron application directory.
   * @param invocationDirectoryPath - Absolute working directory selected by the launcher.
   */
  public async start(
    argumentsToParse: readonly string[],
    invocationDirectoryPath: string
  ): Promise<void> {
    const options = this.argumentParser.parse(argumentsToParse);
    await app.whenReady();
    this.artifactUrl = await this.artifactHost.start(
      this.toArtifactHostOptions(options, invocationDirectoryPath)
    );
    await this.createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void this.createWindow();
    });
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
    app.on('before-quit', (event) => {
      if (this.stopped) return;
      event.preventDefault();
      this.stopping ??= this.stopAndQuit();
    });
  }

  /** Opens the currently hosted viewer URL without granting Node.js capabilities to its document. */
  private async createWindow(): Promise<void> {
    if (this.artifactUrl === undefined) {
      throw new Error('Atlas desktop cannot open a window before its artifact host is ready.');
    }
    const window = new BrowserWindow({
      width: 1440,
      height: 960,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    await window.loadURL(this.artifactUrl);
  }

  /** Maps validated presentation arguments to the platform-neutral artifact host contract. */
  private toArtifactHostOptions(
    options: ReturnType<AtlasDesktopArgumentParser['parse']>,
    invocationDirectoryPath: string
  ): AtlasArtifactHostOptions {
    return {
      invocationDirectoryPath,
      workspacePath: options.workspacePath,
      configurationPath: options.configurationPath,
      outputPath: options.outputPath,
      manifestPath: options.manifestPath,
      host: options.host,
      port: options.port
    };
  }

  /** Stops the listener exactly once before allowing Electron to complete its quit sequence. */
  private async stopAndQuit(): Promise<void> {
    await this.artifactHost.stop();
    this.stopped = true;
    app.quit();
  }
}

await new AtlasDesktopApplication(
  new AtlasCompositionRoot().createArtifactHost(),
  new AtlasDesktopArgumentParser()
).start(process.argv.slice(2), process.cwd());

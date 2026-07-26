import type { ArtifactBrowser } from '#application/view/ports/ArtifactBrowser.js';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Delegates opening a validated local Atlas URL to the host operating system's default browser.
 */
export class NodeArtifactBrowser implements ArtifactBrowser {
  /**
   * Requests a detached platform-specific browser launch without invoking a shell for the URL itself.
   *
   * @param url - Absolute local Atlas artifact URL.
   * @returns A promise that resolves once the operating system accepts the launch request.
   */
  public open(url: string): Promise<void> {
    const launch = this.createLaunch(url);
    return new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(launch.command, launch.argumentsToPass, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.once('error', rejectPromise);
      child.once('spawn', () => {
        child.unref();
        resolvePromise();
      });
    });
  }

  /**
   * Selects a platform-native browser launch command with the URL kept as one argument.
   *
   * @param url - Absolute local Atlas artifact URL.
   * @returns Concrete executable and argument vector for the current operating system.
   */
  private createLaunch(url: string): BrowserLaunch {
    if (platform() === 'win32') {
      return new BrowserLaunch('rundll32.exe', ['url.dll,FileProtocolHandler', url]);
    }
    if (platform() === 'darwin') {
      return new BrowserLaunch('open', [url]);
    }
    return new BrowserLaunch('xdg-open', [url]);
  }
}

/**
 * Represents one platform-native browser launcher command and its argument vector.
 */
class BrowserLaunch {
  /**
   * Creates one browser launcher process description.
   *
   * @param command - Executable name resolved by the host process environment.
   * @param argumentsToPass - Discrete untrusted-safe launch arguments.
   */
  public constructor(
    public readonly command: string,
    public readonly argumentsToPass: readonly string[]
  ) {}
}

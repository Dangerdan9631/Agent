import React from 'react';
import { render, type Instance } from 'ink';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';
import { RuntimeUiApp } from '#runtime/presentation/ink/runtime-ui-app.jsx';

/**
 * Starts the Ink renderer at the process terminal boundary.
 */
export class InkRuntimeUiRenderer {
  /**
   * Renders the interactive application and waits until it exits.
   *
   * @param session - Resolved mode, project state, and available commands.
   * @returns Promise fulfilled when Ink unmounts after user exit.
   */
  async render(session: RuntimeUiSession): Promise<void> {
    const instance: Instance = render(<RuntimeUiApp session={session} />);
    await instance.waitUntilExit();
    if (process.stdout.isTTY) process.stdout.write('\u001B[2J\u001B[H');
  }
}

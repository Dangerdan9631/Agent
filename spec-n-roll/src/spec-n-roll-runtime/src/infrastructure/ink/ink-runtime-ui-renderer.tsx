import React from 'react';
import { render, type Instance } from 'ink';
import type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import { RuntimeUiApp } from '#runtime/presentation/ink/runtime-ui-app.jsx';

/**
 * Starts the Ink renderer at the process terminal boundary.
 */
export class InkRuntimeUiRenderer {
  /**
   * Renders the interactive application and waits until it exits.
   *
   * @param mode - Resolved invocation mode that selects the home route.
   * @returns Promise fulfilled when Ink unmounts after user exit.
   */
  async render(mode: RuntimeUiMode): Promise<void> {
    const instance: Instance = render(<RuntimeUiApp mode={mode} />);
    await instance.waitUntilExit();
  }
}

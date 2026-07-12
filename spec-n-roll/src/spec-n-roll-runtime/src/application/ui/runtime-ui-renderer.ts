import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';

/**
 * Defines the boundary that presents and owns an interactive runtime session.
 */
export interface RuntimeUiRenderer {
  /**
   * Presents the selected home experience until the user exits.
   *
   * @param session - Resolved mode, project state, and available commands.
   * @returns Promise fulfilled when the interactive session ends.
   */
  render(session: RuntimeUiSession): Promise<void>;
}

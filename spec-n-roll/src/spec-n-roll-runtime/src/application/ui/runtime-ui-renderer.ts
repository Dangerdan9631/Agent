import type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';

/**
 * Defines the boundary that presents and owns an interactive runtime session.
 */
export interface RuntimeUiRenderer {
  /**
   * Presents the selected home experience until the user exits.
   *
   * @param mode - Resolved global or local UI mode.
   * @returns Promise fulfilled when the interactive session ends.
   */
  render(mode: RuntimeUiMode): Promise<void>;
}

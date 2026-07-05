/**
 * Describes one generated architecture page that can be linked from graph artifacts.
 */
export interface ArchitecturePage {
  /**
   * Human-readable page title shown in navigation controls.
   */
  title: string;

  /**
   * Absolute path to the generated HTML page.
   */
  htmlPath: string;
}

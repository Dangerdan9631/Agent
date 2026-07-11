/**
 * Describes one generated architecture page that can be linked from graph artifacts.
 */
export interface ArchitecturePage {
  /**
   * Human-readable page title shown in navigation controls.
   */
  title: string;

  /**
   * Absolute path to the generated HTML page. Groups omit this value.
   */
  htmlPath?: string;

  /**
   * Child navigation items rendered beneath this item. Children are always visible.
   */
  children?: ArchitecturePage[];
}

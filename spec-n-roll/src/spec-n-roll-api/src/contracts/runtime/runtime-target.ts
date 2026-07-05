/**
 * Describes a resolved runtime executable target.
 */
export interface RuntimeTarget {
  /**
   * Absolute path to the executable script that should receive the invocation.
   * The path must point to a JavaScript or command launcher accepted by Node.
   */
  readonly executablePath: string;

  /**
   * True when the target came from a project-local installation, otherwise
   * false for the global runtime package.
   */
  readonly projectLocal: boolean;
}

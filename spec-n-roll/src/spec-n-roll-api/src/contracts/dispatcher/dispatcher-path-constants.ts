/**
 * Names the project configuration directory used to recognize a Spec-N-Roll
 * project root.
 */
export const SPEC_N_ROLL_CONFIG_DIRECTORY_NAME = '.spec-n-roll';

/**
 * Names the build marker file that is present beside linked dispatcher builds.
 */
export const DISPATCHER_LOCAL_SOURCE_MARKER_FILE = '.source-package-root';

/**
 * Defines the project-local CLI launcher path components below a project root.
 */
export const LOCAL_CLI_RELATIVE_PATH_SEGMENTS = [
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
  'cli',
  'bin',
  'spec-n-roll-runtime.js',
] as const;

/**
 * Defines the project-local MCP server path components below a project root.
 */
export const LOCAL_MCP_RELATIVE_PATH_SEGMENTS = [
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
  'cli',
  'bin',
  'spec-n-roll-mcp.js',
] as const;

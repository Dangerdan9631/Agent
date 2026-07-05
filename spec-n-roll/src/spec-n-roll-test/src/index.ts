/**
 * Lists the package names expected by the stub implementation tests.
 */
export const expectedPackageNames = {
  dispatcher: 'spec-n-roll',
  runtime: 'spec-n-roll-runtime',
  mcp: 'spec-n-roll-mcp',
  sdk: 'spec-n-roll-sdk',
  api: 'spec-n-roll-api',
  test: 'spec-n-roll-test',
} as const;

/**
 * Creates a normalized CLI argument array for process execution tests.
 *
 * @param args - Individual command line arguments in the order they should be passed.
 * @returns A readonly argument array suitable for child process calls.
 */
export function createCliArgs(...args: string[]): readonly string[] {
  return args;
}

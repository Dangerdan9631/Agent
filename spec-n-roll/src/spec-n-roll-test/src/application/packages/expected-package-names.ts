/**
 * Lists the package names expected by the stub implementation tests.
 */
export class ExpectedPackageNames {
  /**
   * Public dispatcher package name.
   */
  readonly dispatcher = 'spec-n-roll';

  /**
   * Internal runtime package name.
   */
  readonly runtime = 'spec-n-roll-runtime';

  /**
   * MCP executable package name.
   */
  readonly mcp = 'spec-n-roll-mcp';

  /**
   * SDK library package name.
   */
  readonly sdk = 'spec-n-roll-sdk';

  /**
   * Shared API contract package name.
   */
  readonly api = 'spec-n-roll-api';

  /**
   * Test support package name.
   */
  readonly test = 'spec-n-roll-test';
}

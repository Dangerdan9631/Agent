/**
 * Declares external capabilities needed to apply neutral manifesto guidance.
 */
export interface ManifestoRequirements {
  /**
   * Stable tool identifiers required by the manifesto.
   */
  readonly tools?: readonly string[];
  /**
   * Stable MCP server identifiers required by the manifesto.
   */
  readonly mcpServers?: readonly string[];
}

/**
 * Defines a versioned, agent-neutral instruction layer.
 */
export interface ManifestoDefinition {
  /**
   * Stable identity retained across versions.
   */
  readonly id: string;
  /**
   * Exact semantic version of the instruction contract.
   */
  readonly version: string;
  /**
   * Neutral explanation of the guidance's purpose.
   */
  readonly purpose: string;
  /**
   * Neutral source content rendered later by an agent extension.
   */
  readonly source: string;
  /**
   * Optional JSON Schema for approved read-only context.
   */
  readonly inputSchema?: Readonly<Record<string, unknown>>;
  /**
   * Optional neutral template populated from approved read-only context.
   */
  readonly inputTemplate?: string;
  /**
   * Optional capability requirements checked before execution.
   */
  readonly requirements?: ManifestoRequirements;
  /**
   * Rule identities that step-specific guidance cannot replace.
   */
  readonly protectedRules?: readonly string[];
}

/**
 * Selects one manifesto version and its failure behavior.
 */
export interface ManifestoReference {
  /**
   * Stable manifesto identity.
   */
  readonly id: string;
  /**
   * Exact required version.
   */
  readonly version: string;
  /**
   * Whether resolution failure blocks the step.
   */
  readonly required: boolean;
}

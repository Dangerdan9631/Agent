import type {
  ManifestoDefinition,
  ManifestoProvenance,
  ManifestoReference,
  StepDefinition,
  WorkflowDefinition,
} from 'spec-n-roll-api';

/**
 * Contains neutral guidance and provenance resolved before step execution.
 */
export interface ManifestoResolution {
  /**
   * Successfully resolved definitions in global-then-step order.
   */
  readonly definitions: readonly ManifestoDefinition[];
  /**
   * Provenance for every attempted reference.
   */
  readonly provenance: readonly ManifestoProvenance[];
  /**
   * Non-blocking optional-resolution warnings.
   */
  readonly warnings: readonly string[];
  /**
   * Whether a required failure blocks skill execution.
   */
  readonly blocking: boolean;
}

/**
 * Describes capabilities available to a workflow attempt.
 */
export interface ManifestoCapabilitySet {
  /**
   * Tool identifiers available to the executing agent.
   */
  readonly tools: ReadonlySet<string>;
  /**
   * MCP server identifiers available to the executing agent.
   */
  readonly mcpServers: ReadonlySet<string>;
}

/**
 * Resolves agent-neutral manifesto guidance without mutating workflow state.
 */
export class ManifestoResolver {
  /**
   * Resolves global guidance followed by the active step's refinements.
   *
   * @param workflow - Validated workflow definition containing manifesto declarations.
   * @param step - Active step definition.
   * @param capabilities - Read-only capabilities available for compatibility checks.
   * @returns Ordered neutral definitions and complete attempt provenance.
   */
  public resolve(
    workflow: WorkflowDefinition,
    step: StepDefinition,
    capabilities: ManifestoCapabilitySet,
  ): ManifestoResolution {
    const definitions = new Map(
      (workflow.manifestoDefinitions ?? []).map((definition) => [
        definition.id,
        definition,
      ]),
    );
    const references = [
      ...(workflow.manifestos ?? []).map((reference) => ({
        reference,
        scope: 'global' as const,
      })),
      ...(step.manifestos ?? []).map((reference) => ({
        reference,
        scope: 'step' as const,
      })),
    ];
    const resolved: ManifestoDefinition[] = [];
    const provenance: ManifestoProvenance[] = [];
    const warnings: string[] = [];
    const protectedRules = new Set<string>();

    references.forEach(({ reference, scope }, order) => {
      const definition = definitions.get(reference.id);
      const failure = this.failure(definition, reference, capabilities);
      const protectedConflict =
        scope === 'step'
          ? definition?.protectedRules?.find((rule) => protectedRules.has(rule))
          : undefined;
      const message =
        failure ??
        (protectedConflict == null
          ? undefined
          : `Step manifesto "${reference.id}" cannot replace protected global rule "${protectedConflict}".`);

      if (definition == null || message != null) {
        const outcome = reference.required ? 'blocked' : 'skipped';
        provenance.push({
          id: reference.id,
          version: reference.version,
          order,
          scope,
          outcome,
          message: message ?? `Manifesto "${reference.id}" is not declared.`,
        });
        if (outcome === 'skipped') {
          warnings.push(message ?? `Manifesto "${reference.id}" is not declared.`);
        }
        return;
      }

      resolved.push(definition);
      provenance.push({
        id: reference.id,
        version: reference.version,
        order,
        scope,
        outcome: 'loaded',
      });
      if (scope === 'global') {
        definition.protectedRules?.forEach((rule) => protectedRules.add(rule));
      }
    });

    return {
      definitions: resolved,
      provenance,
      warnings,
      blocking: provenance.some((entry) => entry.outcome === 'blocked'),
    };
  }

  private failure(
    definition: ManifestoDefinition | undefined,
    reference: ManifestoReference,
    capabilities: ManifestoCapabilitySet,
  ): string | undefined {
    if (definition == null) {
      return undefined;
    }
    if (definition.version !== reference.version) {
      return `Manifesto "${reference.id}" requires version ${reference.version}, but ${definition.version} is declared.`;
    }
    const missingTool = definition.requirements?.tools?.find(
      (tool) => !capabilities.tools.has(tool),
    );
    if (missingTool != null) {
      return `Manifesto "${reference.id}" requires unavailable tool "${missingTool}".`;
    }
    const missingServer = definition.requirements?.mcpServers?.find(
      (server) => !capabilities.mcpServers.has(server),
    );
    return missingServer == null
      ? undefined
      : `Manifesto "${reference.id}" requires unavailable MCP server "${missingServer}".`;
  }
}

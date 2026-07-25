import path from 'node:path';
import fse from 'fs-extra';

import type {
  ManifestoDefinition,
  ManifestoReference,
  WorkflowConfig,
  WorkflowStep,
} from '../config/schema.js';

/**
 * Load outcome persisted for one manifesto reference in a step attempt.
 */
export type ManifestoLoadOutcome = 'loaded' | 'skipped' | 'blocked';

/**
 * Provenance for one resolved manifesto reference in deterministic load order.
 */
export interface ManifestoProvenance {
  /**
   * Stable identity from the ordered reference.
   */
  id: string;
  /**
   * Resolved semantic version, or the requested version when resolution failed.
   */
  version: string;
  /**
   * Zero-based position across global manifestos followed by step manifestos.
   */
  order: number;
  /**
   * Scope that contributed the ordered reference.
   */
  scope: 'global' | 'step';
  /**
   * Result of resolving, validating, and loading this declaration.
   */
  outcome: ManifestoLoadOutcome;
  /**
   * Human-readable diagnostic when the entry was skipped or blocked.
   */
  message?: string;
}

/**
 * Agent-neutral manifesto content and metadata prepared for a later agent renderer.
 */
export interface ResolvedManifesto {
  /**
   * Stable manifesto identity.
   */
  id: string;
  /**
   * Exact resolved semantic version.
   */
  version: string;
  /**
   * Neutral purpose describing the guidance.
   */
  purpose: string;
  /**
   * Scope that selected the declaration.
   */
  scope: 'global' | 'step';
  /**
   * Project-relative source path.
   */
  source: string;
  /**
   * Neutral Markdown instruction content.
   */
  content: string;
  /**
   * Optional read-only input schema.
   */
  inputSchema?: Record<string, unknown>;
  /**
   * Optional neutral input template.
   */
  inputTemplate?: string;
  /**
   * Declared tool and MCP requirements.
   */
  requirements?: ManifestoDefinition['requirements'];
  /**
   * Protected global rule identities.
   */
  protectedRules?: string[];
}

/**
 * Complete resolution result for one step attempt.
 */
export interface ManifestoResolution {
  /**
   * Successfully loaded manifestos in global-then-step order.
   */
  manifestos: ResolvedManifesto[];
  /**
   * Provenance for every attempted reference, including failures.
   */
  provenance: ManifestoProvenance[];
  /**
   * Non-blocking diagnostics produced by optional references.
   */
  diagnostics: string[];
  /**
   * Whether a required reference prevents skill execution.
   */
  blocking: boolean;
}

/**
 * Resolves configured manifestos without exposing mutable workflow state or agent-specific formats.
 */
export class ManifestoResolver {
  /**
   * Resolves ordered global and step references for one workflow step.
   *
   * @param projectRoot - Absolute project root containing user-owned manifesto sources.
   * @param config - Validated workflow configuration with manifesto declarations.
   * @param step - Active workflow step definition.
   * @returns Resolution, provenance, diagnostics, and blocking status.
   */
  public async resolve(
    projectRoot: string,
    config: WorkflowConfig,
    step: WorkflowStep,
  ): Promise<ManifestoResolution> {
    const definitions = new Map((config.manifestos ?? []).map((entry) => [entry.id, entry]));
    const references = [
      ...(config.globalManifestos ?? []).map((reference) => ({
        reference,
        scope: 'global' as const,
      })),
      ...(step.manifestos ?? []).map((reference) => ({
        reference,
        scope: 'step' as const,
      })),
    ];
    const manifestos: ResolvedManifesto[] = [];
    const provenance: ManifestoProvenance[] = [];
    const diagnostics: string[] = [];
    const protectedGlobalRules = new Set<string>();

    for (const [order, candidate] of references.entries()) {
      const result = await this.resolveReference(
        projectRoot,
        definitions,
        candidate.reference,
        candidate.scope,
        order,
      );
      const protectedConflict =
        candidate.scope === 'step' &&
        result.manifesto?.protectedRules?.find((rule) => protectedGlobalRules.has(rule));
      if (protectedConflict != null) {
        const message = `Step manifesto "${candidate.reference.id}" cannot replace protected global rule "${protectedConflict}".`;
        const conflict = this.failureProvenance(
          candidate.reference,
          result.provenance.version,
          candidate.scope,
          order,
          message,
        );
        provenance.push(conflict);
        if (conflict.outcome === 'skipped') {
          diagnostics.push(message);
        }
        continue;
      }

      provenance.push(result.provenance);
      if (result.manifesto != null) {
        manifestos.push(result.manifesto);
        if (candidate.scope === 'global') {
          for (const rule of result.manifesto.protectedRules ?? []) {
            protectedGlobalRules.add(rule);
          }
        }
      }
      if (result.provenance.outcome === 'skipped' && result.provenance.message != null) {
        diagnostics.push(result.provenance.message);
      }
    }

    return {
      manifestos,
      provenance,
      diagnostics,
      blocking: provenance.some((entry) => entry.outcome === 'blocked'),
    };
  }

  private async resolveReference(
    projectRoot: string,
    definitions: ReadonlyMap<string, ManifestoDefinition>,
    reference: ManifestoReference,
    scope: 'global' | 'step',
    order: number,
  ): Promise<{ manifesto?: ResolvedManifesto; provenance: ManifestoProvenance }> {
    const definition = definitions.get(reference.id);
    const version = definition?.version ?? reference.version ?? 'unknown';
    const failure = this.validateDefinition(projectRoot, reference, definition);
    if (failure != null) {
      return {
        provenance: this.failureProvenance(reference, version, scope, order, failure),
      };
    }

    const resolvedDefinition = definition as ManifestoDefinition;
    const absoluteSource = path.resolve(projectRoot, resolvedDefinition.source);
    try {
      const content = await fse.readFile(absoluteSource, 'utf8');
      if (content.trim().length === 0) {
        return {
          provenance: this.failureProvenance(
            reference,
            version,
            scope,
            order,
            `Manifesto "${reference.id}" source is empty.`,
          ),
        };
      }

      return {
        manifesto: {
          id: resolvedDefinition.id,
          version: resolvedDefinition.version,
          purpose: resolvedDefinition.purpose,
          scope,
          source: resolvedDefinition.source,
          content,
          inputSchema: resolvedDefinition.inputSchema,
          inputTemplate: resolvedDefinition.inputTemplate,
          requirements: resolvedDefinition.requirements,
          protectedRules: resolvedDefinition.protectedRules,
        },
        provenance: {
          id: reference.id,
          version,
          order,
          scope,
          outcome: 'loaded',
        },
      };
    } catch {
      return {
        provenance: this.failureProvenance(
          reference,
          version,
          scope,
          order,
          `Manifesto "${reference.id}" source "${resolvedDefinition.source}" is missing or unreadable.`,
        ),
      };
    }
  }

  private validateDefinition(
    projectRoot: string,
    reference: ManifestoReference,
    definition: ManifestoDefinition | undefined,
  ): string | null {
    if (definition == null) {
      return `Manifesto "${reference.id}" is not declared.`;
    }
    if (reference.version != null && reference.version !== definition.version) {
      return `Manifesto "${reference.id}" requires version ${reference.version}, but ${definition.version} is registered.`;
    }

    const allowedRoot = path.resolve(projectRoot, '.spec-n-roll', 'config', 'manifesto');
    const source = path.resolve(projectRoot, definition.source);
    if (source !== allowedRoot && !source.startsWith(`${allowedRoot}${path.sep}`)) {
      return `Manifesto "${reference.id}" source must remain under .spec-n-roll/config/manifesto/.`;
    }
    return null;
  }

  private failureProvenance(
    reference: ManifestoReference,
    version: string,
    scope: 'global' | 'step',
    order: number,
    message: string,
  ): ManifestoProvenance {
    return {
      id: reference.id,
      version,
      order,
      scope,
      outcome: reference.required === false ? 'skipped' : 'blocked',
      message,
    };
  }
}

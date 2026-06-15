import { z } from 'zod';

/**
 * Lowercase alphanumeric segments separated by single hyphens, with no leading,
 * trailing, or consecutive hyphens.
 */
export const kebabCaseIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Zod schema for kebab-case identifiers used across workflow and extension config.
 */
export const kebabCaseIdSchema = z.string().regex(kebabCaseIdPattern);

/**
 * Semantic version core with optional prerelease or build metadata suffix.
 */
export const semverPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/;

/**
 * Zod schema for toolkit and extension version strings.
 */
export const semverSchema = z.string().regex(semverPattern);

/**
 * `spec-n-` prefix followed by lowercase command segments for agent slash commands.
 */
export const specNCommandPattern = /^spec-n-[a-z0-9-]+$/;

/**
 * Zod schema for Spec-N-Roll workflow command names exposed to agents.
 */
export const specNCommandSchema = z.string().regex(specNCommandPattern);

/**
 * Three or more digits with no leading slug segment, matching directory IDs such as `001`.
 */
export const taskSpecIdPattern = /^[0-9]{3,}$/;

/**
 * Zod schema for auto-assigned numeric task spec identifiers.
 */
export const taskSpecIdSchema = z.string().regex(taskSpecIdPattern);

/**
 * Zod schema for one AI coding agent selected for a project.
 */
export const agentConfigSchema = z
  .object({
    /**
     * Stable identifier naming the agent generator extension this entry configures.
     */
    id: z.string().min(1),
    /**
     * Optional human-readable label when the id alone is insufficient for identification.
     */
    displayName: z.string().optional(),
    /**
     * Whether workflow commands are generated and exposed for this agent in the project configuration.
     */
    enabled: z.boolean(),
    /**
     * Fixed prefix for agent-facing slash commands generated from workflow steps.
     */
    commandPrefix: z.literal('spec-n-'),
    /**
     * Optional project-relative paths where agent rule files are written during init.
     */
    ruleTargets: z.array(z.string()).optional(),
    /**
     * Optional project-relative paths where agent skill files are written during init.
     */
    skillTargets: z.array(z.string()).optional(),
  })
  .strict();

/**
 * One configured agent environment for the project.
 */
export type AgentConfig = z.infer<typeof agentConfigSchema>;

/**
 * Zod schema for a workflow step defining its execution configuration.
 */
export const workflowStepSchema = z
  .object({
    /**
     * Unique kebab-case identifier referenced by workflow variants when composing step sequences.
     */
    id: kebabCaseIdSchema,
    /**
     * Execution source discriminator: built-in (internal handler), extension (delegated handler), or hook (injection point).
     */
    kind: z.enum(['built-in', 'extension', 'hook']),
    /**
     * Agent-facing slash command name for this step; must match specNCommandSchema (`spec-n-` prefix).
     */
    command: specNCommandSchema,
    /**
     * Project-relative path to the handler module; present for built-in and hook kinds, omitted for pure extension delegation.
     */
    implementation: z.string().optional(),
    /**
     * Kebab-case id of the extension providing this step; required when kind is `extension`.
     */
    extensionId: kebabCaseIdSchema.optional(),
    /**
     * Integer sort key when multiple steps compete for the same phase; lower values take precedence.
     */
    priority: z.number().int().optional(),
    /**
     * Whether this step definition is eligible for selection in workflow variants.
     */
    enabled: z.boolean(),
    /**
     * Optional list of project-relative artifact paths this step is expected to produce; supports partial-completion detection.
     */
    outputs: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Workflow step type with execution configuration for a single workflow phase.
 */
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

/**
 * Zod schema for a workflow variant defining a sequence of steps.
 */
export const workflowVariantSchema = z
  .object({
    /**
     * Unique kebab-case identifier for this variant within the workflow configuration.
     */
    id: kebabCaseIdSchema,
    /**
     * Non-empty human-readable title for the variant.
     */
    name: z.string().min(1),
    /**
     * Optional prose explaining the variant's intended complexity tier or purpose.
     */
    description: z.string().optional(),
    /**
     * Non-empty ordered list of step ids defining the execution sequence; tier variants conventionally start with a shared specify step reference.
     */
    steps: z.array(kebabCaseIdSchema).min(1),
    /**
     * When true, marks this variant as the default tier selection for manual override; at most one variant should set this.
     */
    default: z.boolean().optional(),
  })
  .strict();

/**
 * Workflow variant type defining a named sequence of workflow steps.
 */
export type WorkflowVariant = z.infer<typeof workflowVariantSchema>;

/**
 * Zod schema for an extension reference in the workflow configuration.
 */
export const extensionRefSchema = z
  .object({
    /**
     * Unique kebab-case identifier for this extension within the workflow configuration.
     */
    id: kebabCaseIdSchema,
    /**
     * Non-empty project-relative path to the extension's manifest.json file.
     */
    manifestPath: z.string().min(1),
    /**
     * Whether this extension registration is active; disabled entries are ignored without removing the registration.
     */
    enabled: z.boolean(),
  })
  .strict();

/**
 * Extension reference type for linking extensions to the workflow.
 */
export type ExtensionRef = z.infer<typeof extensionRefSchema>;

/**
 * Zod schema for the complete workflow configuration.
 */
export const workflowConfigSchema = z
  .object({
    /**
     * Version of this config document's shape so readers can migrate older persisted data.
     */
    schemaVersion: z.string().min(1),
    /**
     * Minimum toolkit semver required to interpret this configuration; must match semverSchema.
     */
    toolkitVersion: semverSchema,
    /**
     * List of agent entries; each declares one configured agent environment.
     */
    agents: z.array(agentConfigSchema),
    /**
     * Non-empty registry of reusable step definitions composed by workflow variants.
     */
    steps: z.array(workflowStepSchema).min(1),
    /**
     * Non-empty list of named workflow variants, each an ordered composition of step references.
     */
    workflows: z.array(workflowVariantSchema).min(1),
    /**
     * Kebab-case id of the workflow variant pre-selected for manual tier override; does not bypass specify-first ordering.
     */
    defaultWorkflowId: kebabCaseIdSchema,
    /**
     * Optional list of registered external extensions that contribute steps, hooks, or variants.
     */
    extensions: z.array(extensionRefSchema).optional(),
  })
  .strict();

/**
 * Project workflow configuration: reusable steps and tier variants.
 */
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;

/**
 * Zod schema for step lifecycle status within a workflow state document.
 */
export const stepLifecycleStatusSchema = z.enum([
  'pending-init',
  'in-progress',
  'validated',
  'completed',
]);

/**
 * Step lifecycle status discriminator for an active step attempt.
 */
export type StepLifecycleStatus = z.infer<typeof stepLifecycleStatusSchema>;

/**
 * Zod schema for per-step-attempt lifecycle metadata stored in workflow state.
 */
export const stepLifecycleSchema = z
  .object({
    /**
     * Workflow step id for the current lifecycle attempt.
     */
    activeStepId: kebabCaseIdSchema,
    /**
     * ISO-8601 timestamp when step init succeeded for `activeStepId`.
     */
    initAt: z.string().datetime().optional(),
    /**
     * ISO-8601 timestamp when the agent reported validation success before finalize.
     */
    validatedAt: z.string().datetime().optional(),
    /**
     * ISO-8601 timestamp when step finalize recorded completion.
     */
    finalizedAt: z.string().datetime().optional(),
    /**
     * Current lifecycle phase for the active step attempt.
     */
    status: stepLifecycleStatusSchema,
  })
  .strict();

/**
 * Per-step-attempt lifecycle metadata stored in workflow state.
 */
export type StepLifecycle = z.infer<typeof stepLifecycleSchema>;

/**
 * Zod schema for project metadata tracking task spec IDs and active task.
 */
export const projectMetadataSchema = z
  .object({
    /**
     * Version of this metadata document's shape so readers can migrate older persisted data.
     */
    schemaVersion: z.string().min(1),
    /**
     * Positive integer counter for the next auto-assigned task spec numeric id; incremented when a new task spec is created.
     */
    nextTaskSpecId: z.number().int().min(1),
    /**
     * Optional taskSpecIdSchema of the task spec currently in implementation, or null when none.
     */
    currentTaskSpecId: taskSpecIdSchema.nullable().optional(),
    /**
     * Optional kebab-case slug paired with currentTaskSpecId; required and non-empty when currentTaskSpecId is set.
     */
    currentTaskSlug: kebabCaseIdSchema.nullable().optional(),
    /**
     * Optional ISO-8601 datetime when implementation began for the current task, or null.
     */
    implementationStartedAt: z.string().datetime().nullable().optional(),
    /**
     * ISO-8601 datetime marking when this metadata was last written.
     */
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.currentTaskSpecId != null && value.currentTaskSlug == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentTaskSlug is required when currentTaskSpecId is set',
        path: ['currentTaskSlug'],
      });
    }
    if (
      value.currentTaskSpecId != null &&
      value.currentTaskSlug != null &&
      value.currentTaskSlug.length < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'currentTaskSlug must be non-empty when currentTaskSpecId is set',
        path: ['currentTaskSlug'],
      });
    }
  });

/**
 * Project metadata type tracking task spec IDs and active implementation task.
 */
export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

/**
 * Re-exported set list types for CLI and MCP adapters.
 */
export type { SetList, SetListsFile } from '../setlists/schema.js';

/**
 * Zod schema for supported repository workflow type identifiers.
 */
export const repositoryWorkflowTypeIdSchema = z.enum(['repository-onboarding', 'repository-drift']);

/**
 * Stable identifier for a repository onboarding or drift workflow type.
 */
export type RepositoryWorkflowTypeId = z.infer<typeof repositoryWorkflowTypeIdSchema>;

/**
 * Zod schema for living-spec coverage requirements before a repository workflow can run.
 */
export const livingSpecCoverageRequirementSchema = z.enum(['absent-or-partial', 'present']);

/**
 * Living-spec coverage requirement for a repository workflow type.
 */
export type LivingSpecCoverageRequirement = z.infer<typeof livingSpecCoverageRequirementSchema>;

/**
 * Zod schema for specify-stage injection instructions bundled with a workflow type.
 */
export const repositorySpecifyInjectionTemplateSchema = z
  .object({
    /**
     * Constraints the specify stage must follow for this workflow type.
     */
    instructions: z.array(z.string().min(1)).min(1),
    /**
     * Additional repository sections expected in specify-stage output.
     */
    sections: z.array(z.string().min(1)).min(1),
  })
  .strict();

/**
 * Specify-stage injection template attached to a repository workflow type.
 */
export type RepositorySpecifyInjectionTemplate = z.infer<
  typeof repositorySpecifyInjectionTemplateSchema
>;

/**
 * Zod schema for repository workflow type metadata exposed to CLI, MCP, and Ink.
 */
export const repositoryWorkflowTypeSchema = z
  .object({
    /**
     * Stable kebab-case workflow type id.
     */
    id: repositoryWorkflowTypeIdSchema,
    /**
     * Maintainer-facing workflow label.
     */
    name: z.string().min(1),
    /**
     * Concise purpose shown in workflow listings and generated skills.
     */
    description: z.string().min(1),
    /**
     * Whether living specs must be absent, partial, or present for the workflow type.
     */
    requiresLivingSpecs: livingSpecCoverageRequirementSchema,
    /**
     * Instructions and sections injected into the normal specify stage.
     */
    specifyInjectionTemplate: repositorySpecifyInjectionTemplateSchema,
  })
  .strict();

/**
 * Metadata describing a repository workflow type.
 */
export type RepositoryWorkflowType = z.infer<typeof repositoryWorkflowTypeSchema>;

/**
 * Zod schema for bounded discovery limits on a repository workflow pass.
 */
export const discoveryPlanBoundsSchema = z
  .object({
    /**
     * Maximum project-relative directories to inspect in one pass.
     */
    maxDirectories: z.number().int().positive().optional(),
    /**
     * Maximum project-relative files to inspect in one pass.
     */
    maxFiles: z.number().int().positive().optional(),
    /**
     * Maximum distinct product areas to include in one pass.
     */
    maxProductAreas: z.number().int().positive().optional(),
  })
  .strict();

/**
 * Bounded limits applied to a repository discovery pass.
 */
export type DiscoveryPlanBounds = z.infer<typeof discoveryPlanBoundsSchema>;

/**
 * Zod schema for repository workflow discovery plan mode.
 */
export const discoveryPlanModeSchema = repositoryWorkflowTypeIdSchema;

/**
 * Repository workflow mode used when recommending or approving discovery scope.
 */
export type DiscoveryPlanMode = z.infer<typeof discoveryPlanModeSchema>;

/**
 * Zod schema for maintainer-approved repository discovery scope.
 */
export const discoveryPlanSchema = z
  .object({
    /**
     * Workflow mode that produced or consumes this plan.
     */
    mode: discoveryPlanModeSchema,
    /**
     * Project-relative directories and files included in discovery scope.
     */
    includedPaths: z.array(z.string().min(1)),
    /**
     * Project-relative directories and files explicitly deferred from this pass.
     */
    omittedPaths: z.array(z.string()),
    /**
     * Existing or proposed living-spec targets included in scope.
     */
    livingSpecTargets: z.array(z.string()),
    /**
     * How tests are discovered and related to behaviors during this pass.
     */
    testMappingStrategy: z.string().min(1),
    /**
     * Project-relative documentation sources considered as evidence.
     */
    documentationSources: z.array(z.string()),
    /**
     * Maintainer decision points recorded before specify output finalizes.
     */
    reviewCheckpoints: z.array(z.string().min(1)).min(1),
    /**
     * Bounded limits for large or ambiguous repositories.
     */
    bounds: discoveryPlanBoundsSchema,
  })
  .strict();

/**
 * Recommended and maintainer-approved analysis scope for a repository workflow run.
 */
export type DiscoveryPlan = z.infer<typeof discoveryPlanSchema>;

/**
 * Zod schema for optional repository workflow scope input from maintainers.
 */
export const repositoryWorkflowScopeSchema = z
  .object({
    /**
     * Project-relative paths to include in discovery scope.
     */
    includedPaths: z.array(z.string().min(1)).optional(),
    /**
     * Project-relative paths to defer from this pass.
     */
    omittedPaths: z.array(z.string()).optional(),
    /**
     * Living-spec files or scenario groups to include in scope.
     */
    livingSpecTargets: z.array(z.string().min(1)).optional(),
    /**
     * Named product areas to prioritize during discovery.
     */
    productAreas: z.array(z.string().min(1)).optional(),
    /**
     * Maintainer-provided command hints for behavior discovery.
     */
    commandHints: z.array(z.string().min(1)).optional(),
  })
  .strict();

/**
 * Optional maintainer-provided scope for starting a repository workflow.
 */
export type RepositoryWorkflowScope = z.infer<typeof repositoryWorkflowScopeSchema>;

/**
 * Zod schema for repository evidence source categories.
 */
export const repositoryEvidenceSourceTypeSchema = z.enum([
  'code',
  'test',
  'documentation',
  'living-spec',
  'configuration',
]);

/**
 * Source category for a repository evidence record.
 */
export type RepositoryEvidenceSourceType = z.infer<typeof repositoryEvidenceSourceTypeSchema>;

/**
 * Zod schema for repository evidence classification kinds.
 */
export const repositoryEvidenceKindSchema = z.enum([
  'confirmed-behavior',
  'inferred-intent',
  'assumption',
  'conflict',
  'limitation',
]);

/**
 * Classification of how strongly a source supports a behavior summary.
 */
export type RepositoryEvidenceKind = z.infer<typeof repositoryEvidenceKindSchema>;

/**
 * Zod schema for informational evidence confidence levels.
 */
export const repositoryEvidenceConfidenceSchema = z.enum(['high', 'medium', 'low']);

/**
 * Maintainer-facing confidence level for an evidence record.
 */
export type RepositoryEvidenceConfidence = z.infer<typeof repositoryEvidenceConfidenceSchema>;

/**
 * Zod schema for one repository evidence observation.
 */
export const repositoryEvidenceSchema = z
  .object({
    /**
     * Stable identifier within a repository workflow run.
     */
    id: z.string().min(1),
    /**
     * Category of the evidence source.
     */
    sourceType: repositoryEvidenceSourceTypeSchema,
    /**
     * Project-relative path plus optional symbol, line, scenario, or command reference.
     */
    sourceRef: z.string().min(1),
    /**
     * User-observable behavior supported or challenged by the source.
     */
    behaviorSummary: z.string().min(1),
    /**
     * How the source relates to confirmed versus inferred behavior.
     */
    evidenceKind: repositoryEvidenceKindSchema,
    /**
     * Informational confidence level for the evidence record.
     */
    confidence: repositoryEvidenceConfidenceSchema,
    /**
     * Optional short rationale or limitation for the record.
     */
    notes: z.string().optional(),
  })
  .strict();

/**
 * Observation from code, tests, documentation, configuration, or living specs.
 */
export type RepositoryEvidence = z.infer<typeof repositoryEvidenceSchema>;

/**
 * Zod schema for test coverage relationship types.
 */
export const testCoverageTypeSchema = z.enum(['direct', 'indirect', 'missing', 'unknown']);

/**
 * Coverage relationship between discovered behavior and existing tests.
 */
export type TestCoverageType = z.infer<typeof testCoverageTypeSchema>;

/**
 * Zod schema for behavior-to-test coverage mapping within a repository workflow run.
 */
export const testCoverageMappingSchema = z
  .object({
    /**
     * Stable identifier for the mapped behavior within the run.
     */
    behaviorId: z.string().min(1),
    /**
     * Project-relative test references that support the behavior, when known.
     */
    testRefs: z.array(z.string()),
    /**
     * Coverage relationship between behavior and discovered tests.
     */
    coverageType: testCoverageTypeSchema,
    /**
     * Recommended validation target when coverage is missing or unknown.
     */
    recommendedValidationTarget: z.string().optional(),
    /**
     * Optional rationale for direct, indirect, or missing classification.
     */
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.coverageType === 'missing' || value.coverageType === 'unknown') &&
      (value.recommendedValidationTarget == null || value.recommendedValidationTarget.length < 1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'recommendedValidationTarget is required when coverageType is missing or unknown',
        path: ['recommendedValidationTarget'],
      });
    }
  });

/**
 * Mapping between discovered behavior and supporting or missing tests.
 */
export type TestCoverageMapping = z.infer<typeof testCoverageMappingSchema>;

/**
 * Zod schema for drift finding categories.
 */
export const driftCategorySchema = z.enum(['behavior', 'documentation', 'test', 'organization']);

/**
 * Drift category for a living-spec mismatch against current repository evidence.
 */
export type DriftCategory = z.infer<typeof driftCategorySchema>;

/**
 * Zod schema for maintainer authority choices when evidence sources conflict.
 */
export const driftAuthorityChoiceSchema = z.enum(['code', 'test', 'documentation', 'living-spec']);

/**
 * Maintainer authority choice recorded during specify for a drift finding.
 */
export type DriftAuthorityChoice = z.infer<typeof driftAuthorityChoiceSchema>;

/**
 * Zod schema for proposed downstream resolution intents for drift findings.
 */
export const driftRecommendedChangeSchema = z.enum([
  'update',
  'delete',
  'merge',
  'refresh-wording',
  'add-test',
  'none',
]);

/**
 * Resolution intent for a drift finding without mutating living specs during specify.
 */
export type DriftRecommendedChange = z.infer<typeof driftRecommendedChangeSchema>;

/**
 * Zod schema for a categorized living-spec drift finding.
 */
export const driftFindingSchema = z
  .object({
    /**
     * Stable identifier for the finding within a repository workflow run.
     */
    id: z.string().min(1),
    /**
     * Drift category describing the kind of mismatch observed.
     */
    category: driftCategorySchema,
    /**
     * Project-relative living-spec reference for the affected scenario or feature.
     */
    livingSpecRef: z.string().min(1),
    /**
     * Repository evidence record ids supporting the finding.
     */
    evidenceRefs: z.array(z.string().min(1)).min(1),
    /**
     * Short summary of the observed mismatch.
     */
    summary: z.string().min(1),
    /**
     * Optional authority choice when sources conflict and no default applies.
     */
    authorityChoice: driftAuthorityChoiceSchema.optional(),
    /**
     * Proposed downstream change intent for plan and implementation work.
     */
    recommendedChange: driftRecommendedChangeSchema,
  })
  .strict();

/**
 * Categorized mismatch between existing living specs and current repository evidence.
 */
export type DriftFinding = z.infer<typeof driftFindingSchema>;

/**
 * Zod schema for proposed living-spec change types in specify-stage injection.
 */
export const proposedLivingSpecChangeTypeSchema = z.enum(['add', 'update', 'delete', 'merge']);

/**
 * Proposed living-spec change type for specify-stage injection.
 */
export type ProposedLivingSpecChangeType = z.infer<typeof proposedLivingSpecChangeTypeSchema>;

/**
 * Zod schema for one proposed living-spec change recommendation.
 */
export const proposedLivingSpecChangeSchema = z
  .object({
    /**
     * Kind of living-spec change proposed for downstream implementation.
     */
    changeType: proposedLivingSpecChangeTypeSchema,
    /**
     * Project-relative living-spec reference for the proposed change target.
     */
    targetRef: z.string().min(1),
    /**
     * Short rationale for the proposed change.
     */
    reason: z.string().min(1),
  })
  .strict();

/**
 * Proposed living-spec change recommendation for specify-stage injection.
 */
export type ProposedLivingSpecChange = z.infer<typeof proposedLivingSpecChangeSchema>;

/**
 * Zod schema for a test gap recommendation in specify-stage injection.
 */
export const testGapRecommendationSchema = z
  .object({
    /**
     * Behavior identifier tied to the uncovered validation target.
     */
    behaviorId: z.string().min(1),
    /**
     * User-observable outcome that downstream tests should protect.
     */
    recommendedValidationTarget: z.string().min(1),
  })
  .strict();

/**
 * Test gap recommendation for specify-stage injection.
 */
export type TestGapRecommendation = z.infer<typeof testGapRecommendationSchema>;

/**
 * Zod schema for an ambiguity or authority question surfaced during specify.
 */
export const repositoryInjectionQuestionSchema = z
  .object({
    /**
     * Stable question identifier within the injection payload.
     */
    id: z.string().min(1),
    /**
     * Maintainer-facing prompt for clarify or specify follow-up.
     */
    prompt: z.string().min(1),
  })
  .strict();

/**
 * Ambiguity or authority question included in repository specify-stage injection.
 */
export type RepositoryInjectionQuestion = z.infer<typeof repositoryInjectionQuestionSchema>;

/**
 * Zod schema for repository workflow specify-stage injection payload.
 */
export const specifyStageInjectionSchema = z
  .object({
    /**
     * Repository workflow type that produced the injection.
     */
    workflowTypeId: repositoryWorkflowTypeIdSchema,
    /**
     * Constraints the specify stage must follow.
     */
    instructions: z.array(z.string().min(1)).min(1),
    /**
     * Condensed repository evidence for the spec.
     */
    evidenceSummary: z.array(repositoryEvidenceSchema),
    /**
     * Add, update, delete, or merge recommendations for living specs.
     */
    proposedLivingSpecChanges: z.array(proposedLivingSpecChangeSchema),
    /**
     * Validation targets for uncovered behavior.
     */
    testGapRecommendations: z.array(testGapRecommendationSchema),
    /**
     * Direct, indirect, missing, or unknown mappings for discovered behavior.
     */
    testCoverageMappings: z.array(testCoverageMappingSchema),
    /**
     * Ambiguities or authority choices to surface during specify or clarify.
     */
    questions: z.array(repositoryInjectionQuestionSchema),
    /**
     * Assumptions separate from confirmed facts.
     */
    assumptions: z.array(z.string()),
    /**
     * Categorized drift findings for repository drift specify output.
     */
    driftFindings: z.array(driftFindingSchema).default([]),
  })
  .strict();

/**
 * Workflow-provided context that augments the normal specify stage.
 */
export type SpecifyStageInjection = z.infer<typeof specifyStageInjectionSchema>;

/**
 * Zod schema for repository workflow run lifecycle status.
 */
export const repositoryWorkflowRunStatusSchema = z.enum([
  'planned',
  'discovering',
  'specifying',
  'complete',
  'blocked',
]);

/**
 * Lifecycle status for a repository workflow run.
 */
export type RepositoryWorkflowRunStatus = z.infer<typeof repositoryWorkflowRunStatusSchema>;

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

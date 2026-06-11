import { z } from 'zod';

import { kebabCaseIdSchema, semverSchema, specNCommandSchema } from '../config/schema.js';

/** Pattern for dynamic hook events: before_{stepId} or after_{stepId}. */
export const extensionHookEventPattern = /^(before|after)_[a-z0-9][a-z0-9-]*$/;

/** Reserved CLI lifecycle hook events that are not supported. */
const reservedHookEvents = new Set(['before_update', 'after_update']);

/**
 * Zod schema for an extension step defining a workflow step integration.
 */
export const extensionStepSchema = z
  .object({
    /**
     * Unique kebab-case identifier for this contributed step within the extension manifest.
     */
    id: kebabCaseIdSchema,
    /**
     * Open workflow step ID this extension replaces or augments; must match a registered step in the merged workflow registry.
     */
    stepId: kebabCaseIdSchema,
    /**
     * Agent-facing command name exposed for this step; must match specNCommandSchema.
     */
    command: specNCommandSchema,
    /**
     * Non-empty project-relative path to a JS/TS module exporting the step handler.
     */
    entrypoint: z.string().min(1),
    /**
     * Optional integer sort key when multiple extension steps target the same stepId; lower values take precedence.
     */
    priority: z.number().int().optional(),
    /**
     * Optional flag, defaulting to true, whether the step is enabled when the extension is registered.
     */
    enabledByDefault: z.boolean().optional(),
  })
  .strict();

/**
 * Extension step type for integrating into workflow steps by open stepId.
 */
export type ExtensionStep = z.infer<typeof extensionStepSchema>;

/**
 * Zod schema for an extension hook defining event-driven callbacks.
 */
export const extensionHookSchema = z
  .object({
    /**
     * Unique kebab-case identifier for this hook within the extension manifest.
     */
    id: kebabCaseIdSchema,
    /**
     * Dynamic hook event name: before_{stepId} or after_{stepId} for any registered workflow step ID.
     */
    event: z
      .string()
      .regex(extensionHookEventPattern)
      .refine((value) => !reservedHookEvents.has(value), {
        message: 'CLI lifecycle hook events before_update and after_update are not supported',
      }),
    /**
     * Non-empty project-relative path to a JS/TS module exporting the hook handler.
     */
    entrypoint: z.string().min(1),
    /**
     * Optional flag, defaulting to true, whether a missing handler is tolerated without failing the workflow.
     */
    optional: z.boolean().optional(),
    /**
     * Optional human-readable summary of the hook's purpose.
     */
    description: z.string().optional(),
  })
  .strict();

/**
 * Extension hook type for event-driven workflow callbacks.
 */
export type ExtensionHook = z.infer<typeof extensionHookSchema>;

/**
 * Zod schema for an extension-defined workflow variant.
 */
export const extensionWorkflowVariantSchema = z
  .object({
    /**
     * Unique kebab-case identifier for this variant within the extension manifest.
     */
    id: kebabCaseIdSchema,
    /**
     * Non-empty human-readable title for the variant.
     */
    name: z.string().min(1),
    /**
     * Optional prose explaining the variant's intended use or complexity tier.
     */
    description: z.string().optional(),
    /**
     * Non-empty ordered list of step ids composing this variant; conventionally starts with a shared specify step reference.
     */
    steps: z.array(kebabCaseIdSchema).min(1),
  })
  .strict();

/**
 * Extension workflow variant type for custom workflow definitions.
 */
export type ExtensionWorkflowVariant = z.infer<typeof extensionWorkflowVariantSchema>;

/**
 * Zod schema for the complete extension manifest.
 */
export const extensionManifestSchema = z
  .object({
    /**
     * Version of this manifest document's shape so readers can migrate older extension packages.
     */
    manifestVersion: z.string().min(1),
    /**
     * Unique kebab-case identifier for the extension package.
     */
    id: kebabCaseIdSchema,
    /**
     * Non-empty human-readable title for the extension.
     */
    name: z.string().min(1),
    /**
     * Optional prose summarizing what the extension contributes.
     */
    description: z.string().optional(),
    /**
     * Semver of the toolkit release this extension was designed against; must match semverSchema.
     */
    targetToolkitVersion: semverSchema,
    /**
     * Optional list of workflow step contributions provided by this extension.
     */
    steps: z.array(extensionStepSchema).optional(),
    /**
     * Optional list of lifecycle hook contributions provided by this extension.
     */
    hooks: z.array(extensionHookSchema).optional(),
    /**
     * Optional list of additional workflow variants defined by this extension.
     */
    workflowVariants: z.array(extensionWorkflowVariantSchema).optional(),
  })
  .strict();

/**
 * Complete extension manifest type with all extension metadata.
 */
export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;

import { z } from 'zod';

import { kebabCaseIdSchema } from '../config/schema.js';

/**
 * Zod schema for one configurable set list entry referencing a workflow for triage.
 */
export const setListSchema = z
  .object({
    /**
     * Stable kebab-case identifier unique within the set lists file.
     */
    id: kebabCaseIdSchema,
    /**
     * Human-readable label shown in management surfaces.
     */
    name: z.string().min(1),
    /**
     * Short triage description returned to agents during set list selection.
     */
    description: z.string().min(1),
    /**
     * Kebab-case workflow id from `workflow.config.json`.
     */
    workflowId: kebabCaseIdSchema,
    /**
     * Lower numbers win when triage cannot disambiguate between eligible lists.
     */
    priority: z.number().int().positive(),
    /**
     * When false, the entry is excluded from triage evaluation.
     */
    enabled: z.boolean(),
  })
  .strict();

/**
 * One configurable set list entry referencing a workflow for agent triage.
 */
export type SetList = z.infer<typeof setListSchema>;

/**
 * Zod schema for the on-disk container of all set lists in a project.
 */
export const setListsFileSchema = z
  .object({
    /**
     * Schema version for migration of persisted set list configuration.
     */
    schemaVersion: z.number().int().positive(),
    /**
     * All configured set lists; must contain at least one entry after init.
     */
    setLists: z.array(setListSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const seenIds = new Set<string>();

    for (const [index, setList] of value.setLists.entries()) {
      if (seenIds.has(setList.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate set list id "${setList.id}"`,
          path: ['setLists', index, 'id'],
        });
      }

      seenIds.add(setList.id);
    }
  });

/**
 * On-disk container for all set lists in a project.
 */
export type SetListsFile = z.infer<typeof setListsFileSchema>;

/**
 * Current schema version written for new set list configuration files.
 */
export const SET_LISTS_SCHEMA_VERSION = 1;

/**
 * Parses and validates a set lists document from untrusted JSON.
 *
 * @param raw - Untrusted JSON value read from disk.
 * @returns Validated set lists file.
 */
export function parseSetListsFile(raw: unknown): SetListsFile {
  return setListsFileSchema.parse(raw);
}

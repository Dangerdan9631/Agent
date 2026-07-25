/**
 * Represents a serializable value stored in workflow run context or hook metadata.
 */
export type WorkflowContextValue =
  | boolean
  | number
  | string
  | null
  | readonly WorkflowContextValue[]
  | { readonly [key: string]: WorkflowContextValue };


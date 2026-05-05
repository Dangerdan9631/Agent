export type DiffAction = 'create' | 'update' | 'unchanged';

export interface DiffEntry {
  path: string;
  action: DiffAction;
  /** Unified diff string (present for 'create' and 'update' only) */
  diff?: string;
}

import type { RuntimeInvocation } from 'spec-n-roll-api';

/**
 * Identifies the home experience selected for a runtime invocation.
 */
export type RuntimeUiMode = 'global' | 'local';

/**
 * Resolves whether an invocation starts in the global or project-local UI.
 */
export class RuntimeUiModeResolver {
  /**
   * Resolves the initial UI mode from dispatcher-provided invocation context.
   *
   * @param invocation - Valid runtime invocation with preserved command arguments.
   * @returns Global for explicit global invocations or missing projects, otherwise local.
   */
  resolve(invocation: RuntimeInvocation): RuntimeUiMode {
    return invocation.argv.includes('--global') || invocation.projectRoot == null
      ? 'global'
      : 'local';
  }
}

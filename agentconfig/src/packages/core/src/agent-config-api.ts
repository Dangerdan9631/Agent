// Self-register all built-in generators and importers
import './generators/index';
import './importers/index';

import type { IAgentConfigApi } from 'agentconfig-api';
import type {
  GenerateOptions,
  ValidateOptions,
  ValidateResult,
  DiffOptions,
  DiffResult,
  InitializeOptions,
  InitializeResult,
  ImportOptions,
  ImportResult,
  TranslateOptions,
  TranslateResult,
  ListTargetsOptions,
  ListTargetsResult,
} from 'agentconfig-api';
import {
  runGenerate,
  runValidate,
  runDiff,
  runInitialize,
  runImport,
  runTranslate,
  listTargets,
} from './operations';

class AgentConfigApi implements IAgentConfigApi {
  generate(options: GenerateOptions): Promise<void> {
    return runGenerate(options);
  }

  validate(options: ValidateOptions): Promise<ValidateResult> {
    return runValidate(options);
  }

  diff(options: DiffOptions): Promise<DiffResult> {
    return runDiff(options);
  }

  initialize(options: InitializeOptions): Promise<InitializeResult> {
    return runInitialize(options);
  }

  import(options: ImportOptions): Promise<ImportResult> {
    return runImport(options);
  }

  translate(options: TranslateOptions): Promise<TranslateResult> {
    return runTranslate(options);
  }

  listTargets(options?: ListTargetsOptions): Promise<ListTargetsResult> {
    return listTargets(options);
  }
}

/**
 * Creates and returns the agentconfig API implementation.
 *
 * This is the primary entry point for programmatic use of the agentconfig
 * core library. The returned object satisfies {@link IAgentConfigApi} and
 * orchestrates all operations — configuration loading, IR parsing, code
 * generation, validation, diffing, and plugin management.
 *
 * @returns An {@link IAgentConfigApi} instance backed by the full core runtime.
 *
 * @example
 * import { createAgentConfigApi } from 'agentconfig';
 * import type { IAgentConfigApi } from 'agentconfig-api';
 *
 * const api: IAgentConfigApi = createAgentConfigApi();
 * const { results } = await api.validate({});
 */
export function createAgentConfigApi(): IAgentConfigApi {
  return new AgentConfigApi();
}

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
import type {
  DiffUseCase,
  GenerateUseCase,
  ImportUseCase,
  InitializeUseCase,
  ListTargetsUseCase,
  TranslateUseCase,
  ValidateUseCase,
} from './application/use-cases';

export class AgentConfigApiAdapter implements IAgentConfigApi {
  constructor(
    private readonly generateUseCase: GenerateUseCase,
    private readonly validateUseCase: ValidateUseCase,
    private readonly diffUseCase: DiffUseCase,
    private readonly initializeUseCase: InitializeUseCase,
    private readonly importUseCase: ImportUseCase,
    private readonly translateUseCase: TranslateUseCase,
    private readonly listTargetsUseCase: ListTargetsUseCase,
  ) {}

  generate(options: GenerateOptions): Promise<void> {
    return this.generateUseCase.execute(options);
  }

  validate(options: ValidateOptions): Promise<ValidateResult> {
    return this.validateUseCase.execute(options);
  }

  diff(options: DiffOptions): Promise<DiffResult> {
    return this.diffUseCase.execute(options);
  }

  initialize(options: InitializeOptions): Promise<InitializeResult> {
    return this.initializeUseCase.execute(options);
  }

  import(options: ImportOptions): Promise<ImportResult> {
    return this.importUseCase.execute(options);
  }

  translate(options: TranslateOptions): Promise<TranslateResult> {
    return this.translateUseCase.execute(options);
  }

  listTargets(options?: ListTargetsOptions): Promise<ListTargetsResult> {
    return this.listTargetsUseCase.execute(options);
  }
}

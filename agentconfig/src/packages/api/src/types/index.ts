// ─── IR types ─────────────────────────────────────────────────────────────────
export type {
  IR,
  IRExtensions,
  InstructionFile,
  AgentDefinition,
  SkillDefinition,
  SkillFile,
  CommandDefinition,
  HookDefinition,
  HookType,
  HookEventName,
  ActivationType,
} from './ir';

// ─── Validation types ─────────────────────────────────────────────────────────
export type {
  ValidationLevel,
  ValidationResult,
} from './validation';

// ─── Config types ─────────────────────────────────────────────────────────────
export type { AgentConfig } from './config';

// ─── Generator / plugin types ─────────────────────────────────────────────────
export type {
  FileOutput,
  GeneratorInput,
  AgentGenerator,
  DetectedAgent,
  AgentImportResult,
  AgentTargetPlugin,
  WriteOptions,
  DirectiveTypePlugin,
} from './generator';

// ─── Diff entry types ─────────────────────────────────────────────────────────
export type {
  DiffAction,
  DiffEntry,
} from './diff';

// ─── Generate event types ─────────────────────────────────────────────────────
export type {
  GenerateResult,
  GenerateEvent,
} from './generate';

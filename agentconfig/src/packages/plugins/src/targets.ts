export const BUILT_IN_TARGETS = {
  antigravity: 'antigravity',
  claudeCode: 'claude-code',
  cline: 'cline',
  codex: 'codex',
  copilot: 'copilot',
  copilotCli: 'copilot-cli',
  cursor: 'cursor',
  geminiCli: 'gemini-cli',
  windsurf: 'windsurf',
} as const;

export type BuiltInTarget = (typeof BUILT_IN_TARGETS)[keyof typeof BUILT_IN_TARGETS];
import { registry } from '../registry';

import CopilotPlugins from './copilot';
import CopilotCLIPlugins from './copilot-cli';
import CursorPlugins from './cursor';
import ClaudeCodePlugins from './claude-code';
import GeminiCliPlugins from './gemini-cli';
import AntigravityPlugins from './antigravity';
import CodexPlugins from './codex';
import WindsurfPlugins from './windsurf';
import WindsurfCLIPlugins from './windsurf-cli';
import ClinePlugins from './cline';

const allPlugins = [
  ...CopilotPlugins,
  ...CopilotCLIPlugins,
  ...CursorPlugins,
  ...ClaudeCodePlugins,
  ...GeminiCliPlugins,
  ...AntigravityPlugins,
  ...CodexPlugins,
  ...WindsurfPlugins,
  ...WindsurfCLIPlugins,
  ...ClinePlugins,
];

for (const plugin of allPlugins) {
  registry.registerGenerator(plugin);
}

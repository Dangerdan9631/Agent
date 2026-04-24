/**
 * Import this module to register all built-in generators with the singleton registry.
 * This happens automatically when the public `agentconfig` package is imported via index.ts.
 */
import { registry } from '../registry';

import { CopilotGenerator, CopilotCLIGenerator } from './copilot';
import { CursorGenerator, CursorCLIGenerator } from './cursor';
import { ClaudeCodeGenerator } from './claude-code';
import { GeminiCliGenerator } from './gemini-cli';
import { AntigravityGenerator } from './antigravity';
import { CodexGenerator, CodexCLIGenerator } from './codex';
import { WindsurfGenerator } from './windsurf';
import { ClineGenerator } from './cline';

registry.register(CopilotGenerator);
registry.register(CopilotCLIGenerator);
registry.register(CursorGenerator);
registry.register(CursorCLIGenerator);
registry.register(ClaudeCodeGenerator);
registry.register(GeminiCliGenerator);
registry.register(AntigravityGenerator);
registry.register(CodexGenerator);
registry.register(CodexCLIGenerator);
registry.register(WindsurfGenerator);
registry.register(ClineGenerator);

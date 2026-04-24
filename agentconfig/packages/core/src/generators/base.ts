import type { HookEventName } from '../types/ir';

// ─── Target / exclude filtering ─────────────────────────────────────────────

export function filterForTarget<T extends { targets?: string[]; excludedTargets?: string[] }>(
  items: T[],
  target: string,
): T[] {
  return items.filter((item) => {
    if (item.targets && item.targets.length > 0 && !item.targets.includes(target)) return false;
    if (item.excludedTargets && item.excludedTargets.includes(target)) return false;
    return true;
  });
}

// ─── Frontmatter builder ─────────────────────────────────────────────────────

/**
 * Render a YAML frontmatter block from a plain object.
 * Handles strings, booleans, numbers, and string arrays.
 */
export function buildFrontmatter(fields: Record<string, unknown>): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${JSON.stringify(String(item))}`);
        }
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      // String — quote if it contains YAML-unsafe characters
      const str = String(value);
      const needsQuoting =
        /[:#\[\]{}&*!|>'"@`]/.test(str) ||
        str.includes('\n') ||
        str.startsWith(' ') ||
        str.endsWith(' ') ||
        str === '' ||
        str === 'true' ||
        str === 'false' ||
        str === 'null';
      lines.push(`${key}: ${needsQuoting ? JSON.stringify(str) : str}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

// ─── AI-decided in-text condition ────────────────────────────────────────────

/**
 * Prepend an in-text condition prefix to a body.
 * Used for agents that have no native ai-decided mechanism.
 */
export function buildInTextCondition(description: string, body: string): string {
  return `> **Apply only when:** ${description}\n\n${body}`;
}

// ─── Hook event name translation ─────────────────────────────────────────────

export type AgentHookEventMap = Partial<Record<HookEventName, string>>;

/**
 * Per-target hook event name translation tables.
 * Maps normalized HookEventName → agent-native event name string.
 */
export const HOOK_EVENT_MAPS: Record<string, AgentHookEventMap> = {
  cursor: {
    SessionStart: 'sessionStart',
    SessionEnd: 'sessionEnd',
    PreToolUse: 'preToolUse',
    PostToolUse: 'postToolUse',
    SubagentStart: 'subagentStart',
    SubagentStop: 'subagentStop',
    PreCompact: 'preCompact',
    UserPromptSubmit: 'beforeSubmitPrompt',
  },
  'cursor-cli': {
    SessionStart: 'sessionStart',
    SessionEnd: 'sessionEnd',
    PreToolUse: 'preToolUse',
    PostToolUse: 'postToolUse',
    SubagentStart: 'subagentStart',
    SubagentStop: 'subagentStop',
    PreCompact: 'preCompact',
    UserPromptSubmit: 'beforeSubmitPrompt',
  },
  'claude-code': {
    SessionStart: 'SessionStart',
    SessionEnd: 'SessionEnd',
    PreToolUse: 'PreToolUse',
    PostToolUse: 'PostToolUse',
    SubagentStart: 'SubagentStart',
    SubagentStop: 'SubagentStop',
    PreCompact: 'PreCompact',
    UserPromptSubmit: 'UserPromptSubmit',
    PermissionRequest: 'PermissionRequest',
  },
  'gemini-cli': {
    SessionStart: 'SessionStart',
    SessionEnd: 'SessionEnd',
    PreToolUse: 'BeforeTool',
    PostToolUse: 'AfterTool',
    SubagentStart: 'BeforeAgent',
    SubagentStop: 'AfterAgent',
    PreCompact: 'PreCompress',
  },
  codex: {
    SessionStart: 'SessionStart',
    SessionEnd: 'Stop',
    PreToolUse: 'PreToolUse',
    PostToolUse: 'PostToolUse',
    UserPromptSubmit: 'UserPromptSubmit',
    PermissionRequest: 'PermissionRequest',
  },
  'codex-cli': {
    SessionStart: 'SessionStart',
    SessionEnd: 'Stop',
    PreToolUse: 'PreToolUse',
    PostToolUse: 'PostToolUse',
    UserPromptSubmit: 'UserPromptSubmit',
    PermissionRequest: 'PermissionRequest',
  },
  cline: {
    SessionStart: 'TaskStart',
    SessionEnd: 'TaskComplete',
    PreToolUse: 'PreToolUse',
    PostToolUse: 'PostToolUse',
    PreCompact: 'PreCompact',
    UserPromptSubmit: 'UserPromptSubmit',
  },
};

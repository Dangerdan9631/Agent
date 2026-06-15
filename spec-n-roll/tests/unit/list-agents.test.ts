import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { listBundledAgents } from '../../src/sdk/agents/extension-loader.js';
import { runInit } from '../../src/sdk/init.js';
import {
  formatBundledAgentsList,
  resolveListedAgents,
} from '../../src/sdk/list-agents.js';
describe('listBundledAgents', () => {
  it('returns all agents sorted by id with display names', () => {
    expect(listBundledAgents()).toEqual([
      { id: 'claude-code', name: 'Claude Code' },
      { id: 'codex', name: 'Codex' },
      { id: 'copilot', name: 'GitHub Copilot' },
      { id: 'cursor', name: 'Cursor' },
    ]);
  });
});

describe('formatBundledAgentsList', () => {
  it('aligns agent ids and display names on separate columns with headers', () => {
    const output = formatBundledAgentsList(listBundledAgents());
    expect(output).toBe(
      [
        'id           name',
        'claude-code  Claude Code',
        'codex        Codex',
        'copilot      GitHub Copilot',
        'cursor       Cursor',
      ].join('\n'),
    );
  });
});

describe('resolveListedAgents', () => {
  it('returns all agents when enabledOnly is false', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-list-agents-${Date.now()}`);
    mkdirSync(projectRoot, { recursive: true });

    try {
      const agents = await resolveListedAgents({
        projectRoot,
        enabledOnly: false,
      });

      expect(agents).toEqual(listBundledAgents());
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('returns only enabled configured agents when enabledOnly is true', async () => {
    const projectRoot = path.join(os.tmpdir(), `spec-n-roll-list-enabled-${Date.now()}`);
    mkdirSync(projectRoot, { recursive: true });

    try {
      await runInit({
        projectRoot,
        agents: ['cursor', 'copilot'],
      });

      const workflowConfigPath = path.join(
        projectRoot,
        '.spec-n-roll',
        'config',
        'workflow.config.json',
      );
      const workflowConfig = JSON.parse(readFileSync(workflowConfigPath, 'utf8')) as {
        agents: Array<{ id: string; enabled: boolean }>;
      };
      workflowConfig.agents = workflowConfig.agents.map((agent) =>
        agent.id === 'copilot' ? { ...agent, enabled: false } : agent,
      );
      writeFileSync(workflowConfigPath, `${JSON.stringify(workflowConfig, null, 2)}\n`);

      const agents = await resolveListedAgents({
        projectRoot,
        enabledOnly: true,
      });

      expect(agents).toEqual([{ id: 'cursor', name: 'Cursor' }]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

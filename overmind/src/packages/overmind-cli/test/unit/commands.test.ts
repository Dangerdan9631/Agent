import 'reflect-metadata';

import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import { AttachCommand } from '../../src/commands/attach.js';
import { SendCommand } from '../../src/commands/send.js';
import { ShutdownCommand } from '../../src/commands/shutdown.js';
import { StartCommand } from '../../src/commands/start.js';
import { StartCerebrateCommand } from '../../src/commands/start-cerebrate.js';
import { StartWorkflowCommand } from '../../src/commands/start-workflow.js';
import { StatsCommand } from '../../src/commands/stats.js';
import { StopCerebrateCommand } from '../../src/commands/stop-cerebrate.js';

describe('CLI commands', () => {
  it('delegates the non-streaming commands to the Overmind API surface', async () => {
    const api = {
      getStats: vi.fn(async () => ({
        uptime: 12,
        runningCerebrateCount: 1,
        cerebrates: [{ name: 'hello', runtime: 8, idleLoopCount: 2, state: 'idle' as const }],
      })),
      sendCerebrateCommand: vi.fn(async () => ({ output: 'sent' })),
      shutdown: vi.fn(async () => ({ message: 'shutting down' })),
      start: vi.fn(async () => ({ pid: 123 })),
      startCerebrate: vi.fn(async () => ({ name: 'hello' })),
      startCerebrateWorkflow: vi.fn(async () => ({
        cerebrateName: 'hello',
        workflowName: 'daily-review',
        initialState: 'inspect',
        status: 'running' as const,
      })),
      stopCerebrate: vi.fn(async () => ({ stopped: true, message: 'Cerebrate stopped: hello' })),
    };
    const overmindApi = {
      create: vi.fn(() => api),
    };
    const logger = createLogger();
    const loggerFactory = { create: vi.fn(() => logger) };

    const commands = [
      new StartCommand(overmindApi as never, loggerFactory as never),
      new ShutdownCommand(overmindApi as never, loggerFactory as never),
      new StatsCommand(overmindApi as never, loggerFactory as never),
      new StartCerebrateCommand(overmindApi as never, loggerFactory as never),
      new StartWorkflowCommand(overmindApi as never, loggerFactory as never),
      new StopCerebrateCommand(overmindApi as never, loggerFactory as never),
      new SendCommand(overmindApi as never, loggerFactory as never),
    ];

    await runCommand(commands, ['start', '--config-dir', 'cfg']);
    await runCommand(commands, ['shutdown', '--force', '--config-dir', 'cfg']);
    await runCommand(commands, ['stats', '--config-dir', 'cfg']);
    await runCommand(commands, ['start-cerebrate', 'hello', '--config-dir', 'cfg']);
    await runCommand(commands, ['start-workflow', 'hello', 'daily-review', '--config-dir', 'cfg']);
    await runCommand(commands, ['stop-cerebrate', 'hello', '--config-dir', 'cfg']);
    await runCommand(commands, ['send-command', 'hello', 'run', '--config-dir', 'cfg']);

    expect(overmindApi.create).toHaveBeenCalledWith('cfg');
    expect(api.start).toHaveBeenCalledWith({});
    expect(api.shutdown).toHaveBeenCalledWith({ force: true });
    expect(api.getStats).toHaveBeenCalledWith({});
    expect(api.startCerebrate).toHaveBeenCalledWith({ name: 'hello' });
    expect(api.startCerebrateWorkflow).toHaveBeenCalledWith({
      cerebrateName: 'hello',
      workflowName: 'daily-review',
    });
    expect(api.stopCerebrate).toHaveBeenCalledWith({ cerebrateName: 'hello' });
    expect(api.sendCerebrateCommand).toHaveBeenCalledWith({
      cerebrateName: 'hello',
      command: 'run',
    });
  });

  it('delegates attach with optional name and a fixed history window', async () => {
    const channel = {
      listen: vi.fn(async () => undefined),
      onAttached: vi.fn(() => () => undefined),
      onError: vi.fn(() => () => undefined),
      onOutput: vi.fn(() => () => undefined),
      onTerminate: vi.fn(() => () => undefined),
      terminate: vi.fn(async () => undefined),
    };
    const api = {
      attach: vi.fn(async () => channel),
    };
    const overmindApi = {
      create: vi.fn(() => api),
    };
    const loggerFactory = { create: vi.fn(() => createLogger()) };
    const command = new AttachCommand(overmindApi as never, loggerFactory as never);

    await runCommand([command], ['attach', 'hello', '--config-dir', 'cfg']);
    await runCommand([command], ['attach', '--config-dir', 'cfg']);

    expect(api.attach).toHaveBeenNthCalledWith(1, { name: 'hello', historyPlaybackSize: 100 });
    expect(api.attach).toHaveBeenNthCalledWith(2, { name: undefined, historyPlaybackSize: 100 });
    expect(channel.onOutput).toHaveBeenCalledTimes(2);
    expect(channel.onTerminate).toHaveBeenCalledTimes(2);
    expect(channel.onError).toHaveBeenCalledTimes(2);
    expect(channel.listen).toHaveBeenCalledTimes(2);
  });
});

async function runCommand(commands: Array<{ register(program: Command): void }>, args: string[]): Promise<void> {
  const program = new Command();
  for (const command of commands) {
    command.register(program);
  }

  await program.parseAsync(args, { from: 'user' });
}

function createLogger() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
  };
}

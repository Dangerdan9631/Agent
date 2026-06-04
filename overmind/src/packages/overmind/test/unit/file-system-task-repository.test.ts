import 'reflect-metadata';

import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ensureDefaultCerebrateConfig } from '../../src/infrastructure/config/cerebrate-config-loader.js';
import { FileSystemTaskRepository } from '../../src/infrastructure/persistence/file-system-task-repository.js';

const configDirs = new Set<string>();

afterEach(async () => {
  for (const configDir of configDirs) {
    await rm(configDir, { force: true, recursive: true });
    configDirs.delete(configDir);
  }
});

describe('FileSystemTaskRepository', () => {
  it('allocates and reloads tasks from the filesystem', async () => {
    const configDir = await createConfigDir();
    const repository = new FileSystemTaskRepository(configDir);

    const task = repository.allocateTask('HELO', 'Ship the hello workflow', {
      acceptanceCriteria: ['It passes'],
      subtasks: ['Write code'],
    });

    expect(task.id.toString()).toBe('HELO-00001');
    expect(fs.existsSync(path.join(configDir, 'tasks', 'HELO-00001', 'task.md'))).toBe(true);

    const reloaded = repository.findById('HELO-00001');
    expect(reloaded.toSnapshot()).toMatchObject({
      id: 'HELO-00001',
      status: 'open',
      description: 'Ship the hello workflow',
      acceptanceCriteria: [{ text: 'It passes', done: false }],
      subtasks: [{ text: 'Write code', done: false }],
    });
  });

  it('filters available tasks by dependencies and completion state', async () => {
    const configDir = await createConfigDir();
    const repository = new FileSystemTaskRepository(configDir);

    const dependency = repository.allocateTask('HELO', 'Finish the prerequisite');
    const blocked = repository.allocateTask('HELO', 'Blocked follow-up', {
      dependencies: [dependency.id.toString()],
    });

    expect(repository.findAvailableFor('HELO').map((task) => task.id.toString())).toEqual([
      dependency.id.toString(),
    ]);

    const activeDependency = repository.findById(dependency.id.toString());
    activeDependency.begin(new Date().toISOString());
    activeDependency.markValidating(new Date().toISOString());
    repository.save(activeDependency);
    repository.complete(dependency.id.toString());

    expect(repository.findAvailableFor('HELO').map((task) => task.id.toString())).toContain(
      blocked.id.toString(),
    );
  });

  it('moves completed and cancelled tasks into their status directories', async () => {
    const configDir = await createConfigDir();
    const repository = new FileSystemTaskRepository(configDir);

    const completed = repository.allocateTask('HELO', 'Complete this task');
    const cancelled = repository.allocateTask('HELO', 'Cancel this task');

    const completeCandidate = repository.findById(completed.id.toString());
    completeCandidate.begin(new Date().toISOString());
    completeCandidate.markValidating(new Date().toISOString());
    repository.save(completeCandidate);
    repository.complete(completed.id.toString());
    repository.cancel(cancelled.id.toString());

    expect(fs.existsSync(path.join(configDir, 'completed-tasks', completed.id.toString(), 'task.md'))).toBe(true);
    expect(fs.existsSync(path.join(configDir, 'cancelled-tasks', cancelled.id.toString(), 'task.md'))).toBe(true);
  });
});

async function createConfigDir(): Promise<string> {
  const configDir = await mkdtemp(path.join(os.tmpdir(), 'overmind-task-repo-'));
  configDirs.add(configDir);
  ensureDefaultCerebrateConfig(path.join(configDir, 'cerebrates', 'hello'));
  return configDir;
}

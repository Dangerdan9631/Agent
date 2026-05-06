import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cancelTask,
  checkOffAcceptanceCriteria,
  checkOffSubtask,
  completeTask,
  createTask,
  getAvailableTasks,
  loadTask,
  startTask,
} from '../../src/tasks.js';

function makeTestConfigDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'overmind-tasks-test-'));
}

function writeCerebrateConfig(configDir: string, name: string, taskId: string, nextTaskNumber = 1): void {
  const cerebrateDir = path.join(configDir, 'cerebrates', name);
  fs.mkdirSync(cerebrateDir, { recursive: true });
  fs.writeFileSync(
    path.join(cerebrateDir, 'cerebrate-config.yaml'),
    [
      `description: "${name}"`,
      `taskId: ${taskId}`,
      `nextTaskNumber: ${nextTaskNumber}`,
      'responsibilities: "test"',
      'commands: []',
      '',
    ].join('\n'),
    'utf8',
  );
}

describe('tasks', () => {
  it('creates and loads a markdown-backed task', () => {
    const configDir = makeTestConfigDir();
    writeCerebrateConfig(configDir, 'test', 'TEST');

    const task = createTask(configDir, 'TEST', 'Do the thing.', {
      dependencies: ['DEPS-00001'],
      subtasks: ['First step'],
      acceptanceCriteria: ['It works'],
    });

    expect(task.id).toBe('TEST-00001');
    expect(fs.existsSync(path.join(configDir, 'tasks', task.id, 'task.md'))).toBe(true);
    expect(loadTask(configDir, task.id)).toMatchObject({
      id: 'TEST-00001',
      status: 'open',
      description: 'Do the thing.',
      dependencies: ['DEPS-00001'],
      subtasks: [{ text: 'First step', done: false }],
      acceptanceCriteria: [{ text: 'It works', done: false }],
    });
    expect(fs.readFileSync(path.join(configDir, 'cerebrates', 'test', 'cerebrate-config.yaml'), 'utf8')).toContain(
      'nextTaskNumber: 2',
    );
  });

  it('allocates IDs from each cerebrate config counter', () => {
    const configDir = makeTestConfigDir();
    writeCerebrateConfig(configDir, 'test', 'TEST');
    writeCerebrateConfig(configDir, 'other', 'OTHR');

    completeTask(configDir, createTask(configDir, 'TEST', 'First').id);
    cancelTask(configDir, createTask(configDir, 'TEST', 'Second').id);
    createTask(configDir, 'OTHR', 'Other first');
    const task = createTask(configDir, 'TEST', 'Third');

    expect(task.id).toBe('TEST-00003');
    expect(createTask(configDir, 'OTHR', 'Other second').id).toBe('OTHR-00002');
  });

  it('updates checklists and moves terminal tasks', () => {
    const configDir = makeTestConfigDir();
    writeCerebrateConfig(configDir, 'test', 'TEST');
    const task = createTask(configDir, 'TEST', 'Do the thing.', {
      subtasks: ['First step'],
      acceptanceCriteria: ['It works'],
    });

    startTask(configDir, task.id);
    checkOffSubtask(configDir, task.id, 0);
    checkOffAcceptanceCriteria(configDir, task.id, 0);
    completeTask(configDir, task.id);

    expect(fs.existsSync(path.join(configDir, 'tasks', task.id))).toBe(false);
    expect(fs.existsSync(path.join(configDir, 'completed-tasks', task.id, 'task.md'))).toBe(true);
    expect(loadTask(configDir, task.id)).toMatchObject({
      status: 'complete',
      subtasks: [{ text: 'First step', done: true }],
      acceptanceCriteria: [{ text: 'It works', done: true }],
    });
  });

  it('returns only dependency-ready tasks for the requested cerebrate', () => {
    const configDir = makeTestConfigDir();
    writeCerebrateConfig(configDir, 'deps', 'DEPS');
    writeCerebrateConfig(configDir, 'test', 'TEST');
    writeCerebrateConfig(configDir, 'other', 'OTHR');
    const dependency = createTask(configDir, 'DEPS', 'Dependency');
    const available = createTask(configDir, 'TEST', 'Ready task', { dependencies: [dependency.id] });
    createTask(configDir, 'TEST', 'Blocked task', { dependencies: ['DEPS-99999'] });
    createTask(configDir, 'OTHR', 'Other task');

    completeTask(configDir, dependency.id);

    expect(getAvailableTasks(configDir, 'TEST').map((task) => task.id)).toEqual([available.id]);
  });
});

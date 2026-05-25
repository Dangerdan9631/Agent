import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { TaskId } from '../../src/domain/task/task-id.js';
import { Task } from '../../src/domain/task/task.js';

describe('Task', () => {
  it('enforces the open -> in-progress -> validating -> complete lifecycle', () => {
    const task = Task.create(
      TaskId.create('HELO-00001'),
      'say hello',
      '2026-05-24T10:00:00.000Z',
      {
        subtasks: ['greet'],
        acceptanceCriteria: ['user sees greeting'],
      },
    );

    task.begin('2026-05-24T10:01:00.000Z');
    task.markValidating('2026-05-24T10:02:00.000Z');
    task.complete('2026-05-24T10:03:00.000Z');

    expect(task.toSnapshot()).toMatchObject({
      id: 'HELO-00001',
      status: 'complete',
      updatedAt: '2026-05-24T10:03:00.000Z',
      subtasks: [{ text: 'greet', done: false }],
      acceptanceCriteria: [{ text: 'user sees greeting', done: false }],
    });
  });

  it('rejects invalid transitions', () => {
    const task = Task.create(TaskId.create('HELO-00002'), 'say hello', '2026-05-24T10:00:00.000Z');

    expect(() => task.complete('2026-05-24T10:01:00.000Z')).toThrow('cannot move');

    task.begin('2026-05-24T10:01:00.000Z');

    expect(() => task.begin('2026-05-24T10:02:00.000Z')).toThrow('cannot move');
    expect(() => task.cancel('2026-05-24T10:02:00.000Z')).not.toThrow();
  });
});

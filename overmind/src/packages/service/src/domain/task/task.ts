import { createTaskChecklistItems, type TaskChecklistItem } from './task-checklist-item.js';
import { TaskId } from './task-id.js';

export type TaskStatus = 'open' | 'in-progress' | 'validating' | 'cancelled' | 'complete';

export interface TaskSnapshot {
  id: string;
  status: TaskStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  dependencies: string[];
  subtasks: TaskChecklistItem[];
  acceptanceCriteria: TaskChecklistItem[];
}

export interface CreateTaskOptions {
  dependencies?: string[];
  subtasks?: string[];
  acceptanceCriteria?: string[];
}

export class Task {
  private constructor(
    readonly id: TaskId,
    private statusValue: TaskStatus,
    readonly description: string,
    readonly createdAt: string,
    private updatedAtValue: string,
    readonly dependencies: string[],
    readonly subtasks: TaskChecklistItem[],
    readonly acceptanceCriteria: TaskChecklistItem[],
  ) {}

  static create(taskId: TaskId, description: string, now: string, options: CreateTaskOptions = {}): Task {
    return new Task(
      taskId,
      'open',
      description,
      now,
      now,
      [...(options.dependencies ?? [])],
      createTaskChecklistItems(options.subtasks),
      createTaskChecklistItems(options.acceptanceCriteria),
    );
  }

  static rehydrate(snapshot: TaskSnapshot): Task {
    return new Task(
      TaskId.create(snapshot.id),
      snapshot.status,
      snapshot.description,
      snapshot.createdAt,
      snapshot.updatedAt,
      [...snapshot.dependencies],
      snapshot.subtasks.map((item) => ({ ...item })),
      snapshot.acceptanceCriteria.map((item) => ({ ...item })),
    );
  }

  get status(): TaskStatus {
    return this.statusValue;
  }

  get updatedAt(): string {
    return this.updatedAtValue;
  }

  begin(now: string): void {
    this.assertTransition('open', 'in-progress');
    this.statusValue = 'in-progress';
    this.updatedAtValue = now;
  }

  markValidating(now: string): void {
    if (this.statusValue !== 'in-progress') {
      throw new Error(`Task "${this.id}" cannot move from "${this.statusValue}" to "validating".`);
    }

    this.statusValue = 'validating';
    this.updatedAtValue = now;
  }

  complete(now: string): void {
    if (this.statusValue !== 'validating') {
      throw new Error(`Task "${this.id}" cannot move from "${this.statusValue}" to "complete".`);
    }

    this.statusValue = 'complete';
    this.updatedAtValue = now;
  }

  cancel(now: string): void {
    if (this.statusValue === 'complete') {
      throw new Error(`Task "${this.id}" cannot move from "complete" to "cancelled".`);
    }

    this.statusValue = 'cancelled';
    this.updatedAtValue = now;
  }

  toSnapshot(): TaskSnapshot {
    return {
      id: this.id.toString(),
      status: this.statusValue,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAtValue,
      dependencies: [...this.dependencies],
      subtasks: this.subtasks.map((item) => ({ ...item })),
      acceptanceCriteria: this.acceptanceCriteria.map((item) => ({ ...item })),
    };
  }

  private assertTransition(from: TaskStatus, to: TaskStatus): void {
    if (this.statusValue !== from) {
      throw new Error(`Task "${this.id}" cannot move from "${this.statusValue}" to "${to}".`);
    }
  }
}

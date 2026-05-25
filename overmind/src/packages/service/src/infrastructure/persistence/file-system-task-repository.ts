import fs from 'node:fs';
import path from 'node:path';
import type { TaskRepository } from '../../application/ports/task-repository.js';
import { Task } from '../../domain/task/task.js';
import { TaskId } from '../../domain/task/task-id.js';
import { formatTaskMarkdown } from './task-markdown-formatter.js';
import { parseTaskMarkdown } from './task-markdown-parser.js';
import { allocateNextTaskNumber } from './task-number-allocator.js';

const ACTIVE_TASK_DIR = 'tasks';
const COMPLETED_TASK_DIR = 'completed-tasks';
const CANCELLED_TASK_DIR = 'cancelled-tasks';
const TASK_FILE_NAME = 'task.md';

export class FileSystemTaskRepository implements TaskRepository {
  constructor(private readonly configDir: string) {}

  allocateTask(taskPrefix: string, description: string, options = {}): Task {
    const taskNumber = allocateNextTaskNumber(this.configDir, taskPrefix);
    const taskId = TaskId.fromParts(taskPrefix, taskNumber);
    const now = new Date().toISOString();
    const task = Task.create(taskId, description, now, options);
    this.save(task);
    return task;
  }

  findById(taskId: string): Task {
    const taskPath = this.findTaskFile(taskId);
    if (!taskPath) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return parseTaskMarkdown(fs.readFileSync(taskPath, 'utf8'), taskId);
  }

  findAvailableFor(taskPrefix: string): Task[] {
    const activeDir = path.join(this.configDir, ACTIVE_TASK_DIR);
    if (!fs.existsSync(activeDir)) {
      return [];
    }

    return fs
      .readdirSync(activeDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${taskPrefix}-`))
      .map((entry) => {
        try {
          return this.findById(entry.name);
        } catch {
          return undefined;
        }
      })
      .filter((task): task is Task => {
        return task !== undefined
          && (task.status === 'open' || task.status === 'in-progress')
          && task.toSnapshot().dependencies.every((dependency) => this.taskIsComplete(dependency));
      })
      .sort((left, right) => left.id.toString().localeCompare(right.id.toString()));
  }

  save(task: Task): void {
    const taskId = task.id.toString();
    const currentDir = this.findTaskDir(taskId);
    const targetDir = path.join(this.configDir, directoryForStatus(task.status), taskId);

    if (currentDir && path.resolve(currentDir) !== path.resolve(targetDir)) {
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      if (fs.existsSync(targetDir)) {
        throw new Error(`Cannot move task "${taskId}" because target already exists: ${targetDir}`);
      }
      fs.renameSync(currentDir, targetDir);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, TASK_FILE_NAME), formatTaskMarkdown(task), 'utf8');
  }

  complete(taskId: string): Task {
    const task = this.findById(taskId);
    task.complete(new Date().toISOString());
    this.save(task);
    return task;
  }

  cancel(taskId: string): Task {
    const task = this.findById(taskId);
    task.cancel(new Date().toISOString());
    this.save(task);
    return task;
  }

  private findTaskFile(taskId: string): string | undefined {
    const taskDir = this.findTaskDir(taskId);
    return taskDir ? path.join(taskDir, TASK_FILE_NAME) : undefined;
  }

  private findTaskDir(taskId: string): string | undefined {
    for (const directoryName of [ACTIVE_TASK_DIR, COMPLETED_TASK_DIR, CANCELLED_TASK_DIR]) {
      const taskDir = path.join(this.configDir, directoryName, taskId);
      const taskFile = path.join(taskDir, TASK_FILE_NAME);
      if (fs.existsSync(taskFile) && fs.statSync(taskFile).isFile()) {
        return taskDir;
      }
    }

    return undefined;
  }

  private taskIsComplete(taskId: string): boolean {
    return fs.existsSync(path.join(this.configDir, COMPLETED_TASK_DIR, taskId, TASK_FILE_NAME));
  }
}

function directoryForStatus(status: ReturnType<Task['toSnapshot']>['status']): string {
  if (status === 'complete') {
    return COMPLETED_TASK_DIR;
  }
  if (status === 'cancelled') {
    return CANCELLED_TASK_DIR;
  }
  return ACTIVE_TASK_DIR;
}

import type { CreateTaskOptions, Task } from '../../domain/task/task.js';

export interface TaskRepository {
  allocateTask(taskPrefix: string, description: string, options?: CreateTaskOptions): Task;
  findById(taskId: string): Task;
  findAvailableFor(taskPrefix: string): Task[];
  save(task: Task): void;
  complete(taskId: string): Task;
  cancel(taskId: string): Task;
}

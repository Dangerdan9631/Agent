import type { Task } from '../../domain/task/task.js';
import type { TaskChecklistItem } from '../../domain/task/task-checklist-item.js';

export function formatTaskMarkdown(task: Task): string {
  const snapshot = task.toSnapshot();
  return [
    `# ${snapshot.id}`,
    '',
    `**Status:** ${snapshot.status}`,
    `**Created:** ${snapshot.createdAt}`,
    `**Updated:** ${snapshot.updatedAt}`,
    '',
    '## Description',
    '',
    snapshot.description.trim(),
    '',
    '## Dependencies',
    '',
    formatBullets(snapshot.dependencies),
    '',
    '## Subtasks',
    '',
    formatChecklist(snapshot.subtasks),
    '',
    '## Acceptance Criteria',
    '',
    formatChecklist(snapshot.acceptanceCriteria),
    '',
  ].join('\n');
}

function formatBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '';
}

function formatChecklist(items: TaskChecklistItem[]): string {
  return items.length > 0 ? items.map((item) => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n') : '';
}

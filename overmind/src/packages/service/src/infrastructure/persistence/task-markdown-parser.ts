import { Task, type TaskSnapshot, type TaskStatus } from '../../domain/task/task.js';
import type { TaskChecklistItem } from '../../domain/task/task-checklist-item.js';

const TASK_ID_PATTERN = /^([A-Z]{4})-(\d{5})$/;
const TASK_STATUS_PATTERN = /^(open|in-progress|validating|cancelled|complete)$/;

export function parseTaskMarkdown(contents: string, expectedTaskId: string): Task {
  const lines = contents.replace(/\r\n/g, '\n').split('\n');
  const id = parseHeading(lines) ?? expectedTaskId;
  const status = parseMetadata(lines, 'Status');
  const createdAt = parseMetadata(lines, 'Created');
  const updatedAt = parseMetadata(lines, 'Updated');

  if (!TASK_ID_PATTERN.test(id)) {
    throw new Error(`Invalid task ID in task.md: ${id}`);
  }
  if (!status || !TASK_STATUS_PATTERN.test(status)) {
    throw new Error(`Invalid task status in ${id}: ${status ?? '<missing>'}`);
  }
  if (!createdAt || !updatedAt) {
    throw new Error(`Missing created or updated timestamp in ${id}.`);
  }

  const snapshot: TaskSnapshot = {
    id,
    status: status as TaskStatus,
    createdAt,
    updatedAt,
    description: parseSection(lines, 'Description').join('\n').trim(),
    dependencies: parseSection(lines, 'Dependencies')
      .map(parseBullet)
      .filter((dependency): dependency is string => dependency !== undefined),
    subtasks: parseSection(lines, 'Subtasks')
      .map(parseChecklistItem)
      .filter((item): item is TaskChecklistItem => item !== undefined),
    acceptanceCriteria: parseSection(lines, 'Acceptance Criteria')
      .map(parseChecklistItem)
      .filter((item): item is TaskChecklistItem => item !== undefined),
  };

  return Task.rehydrate(snapshot);
}

function parseHeading(lines: string[]): string | undefined {
  const heading = lines.find((line) => line.startsWith('# '));
  return heading?.slice(2).trim();
}

function parseMetadata(lines: string[], name: string): string | undefined {
  const prefix = `**${name}:**`;
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  return line?.slice(prefix.length).trim();
}

function parseSection(lines: string[], heading: string): string[] {
  const headingLine = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === headingLine);
  if (start === -1) {
    return [];
  }

  const sectionLines: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) {
      break;
    }
    sectionLines.push(line);
  }

  return trimBlankEdges(sectionLines);
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]?.trim() === '') {
    start += 1;
  }
  while (end > start && lines[end - 1]?.trim() === '') {
    end -= 1;
  }

  return lines.slice(start, end);
}

function parseBullet(line: string): string | undefined {
  const match = /^-\s+(.+)$/.exec(line.trim());
  return match?.[1].trim();
}

function parseChecklistItem(line: string): TaskChecklistItem | undefined {
  const match = /^-\s+\[([ xX])\]\s+(.+)$/.exec(line.trim());
  if (!match) {
    return undefined;
  }

  return {
    done: match[1].toLowerCase() === 'x',
    text: match[2].trim(),
  };
}

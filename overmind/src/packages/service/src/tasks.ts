import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

export type TaskStatus = 'open' | 'in-progress' | 'validating' | 'cancelled' | 'complete';

export interface TaskChecklistItem {
  text: string;
  done: boolean;
}

export interface Task {
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

const ACTIVE_TASK_DIR = 'tasks';
const COMPLETED_TASK_DIR = 'completed-tasks';
const CANCELLED_TASK_DIR = 'cancelled-tasks';
const TASK_FILE_NAME = 'task.md';
const CEREBRATE_CONFIG_FILE_NAME = 'cerebrate-config.yaml';
const TASK_ID_PATTERN = /^([A-Z]{4})-(\d{5})$/;
const TASK_STATUS_PATTERN = /^(open|in-progress|validating|cancelled|complete)$/;

export function createTask(
  configDir: string,
  cerebrateTaskId: string,
  description: string,
  options: CreateTaskOptions = {},
): Task {
  if (!/^[A-Z]{4}$/.test(cerebrateTaskId)) {
    throw new Error(`Invalid cerebrate task ID "${cerebrateTaskId}". Expected four uppercase letters.`);
  }

  const now = new Date().toISOString();
  const taskNumber = takeNextTaskNumber(configDir, cerebrateTaskId);
  const task: Task = {
    id: `${cerebrateTaskId}-${String(taskNumber).padStart(5, '0')}`,
    status: 'open',
    description,
    createdAt: now,
    updatedAt: now,
    dependencies: options.dependencies ?? [],
    subtasks: (options.subtasks ?? []).map((text) => ({ text, done: false })),
    acceptanceCriteria: (options.acceptanceCriteria ?? []).map((text) => ({ text, done: false })),
  };

  saveTask(configDir, task);
  return task;
}

export function loadTask(configDir: string, taskId: string): Task {
  const taskPath = findTaskFile(configDir, taskId);
  if (!taskPath) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return parseTaskMarkdown(fs.readFileSync(taskPath, 'utf8'), taskId);
}

export function saveTask(configDir: string, task: Task): void {
  const taskDir = findTaskDir(configDir, task.id) ?? path.join(configDir, directoryForStatus(task.status), task.id);

  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, TASK_FILE_NAME), formatTaskMarkdown(task), 'utf8');
}

export function startTask(configDir: string, taskId: string): Task {
  const task = loadTask(configDir, taskId);
  task.status = 'in-progress';
  task.updatedAt = new Date().toISOString();
  saveTask(configDir, task);
  return task;
}

export function checkOffSubtask(configDir: string, taskId: string, index: number): Task {
  const task = loadTask(configDir, taskId);
  assertChecklistIndex(task.subtasks, index, 'subtask');
  task.subtasks[index] = { ...task.subtasks[index], done: true };
  task.updatedAt = new Date().toISOString();
  saveTask(configDir, task);
  return task;
}

export function checkOffAcceptanceCriteria(configDir: string, taskId: string, index: number): Task {
  const task = loadTask(configDir, taskId);
  assertChecklistIndex(task.acceptanceCriteria, index, 'acceptance criterion');
  task.acceptanceCriteria[index] = { ...task.acceptanceCriteria[index], done: true };
  task.updatedAt = new Date().toISOString();
  saveTask(configDir, task);
  return task;
}

export function cancelTask(configDir: string, taskId: string): Task {
  const task = loadTask(configDir, taskId);
  task.status = 'cancelled';
  task.updatedAt = new Date().toISOString();
  moveTaskToStatusDir(configDir, task);
  return task;
}

export function completeTask(configDir: string, taskId: string): Task {
  const task = loadTask(configDir, taskId);
  task.status = 'complete';
  task.updatedAt = new Date().toISOString();
  moveTaskToStatusDir(configDir, task);
  return task;
}

export function getAvailableTasks(configDir: string, cerebrateTaskId: string): Task[] {
  const activeDir = path.join(configDir, ACTIVE_TASK_DIR);
  if (!fs.existsSync(activeDir)) {
    return [];
  }

  return fs
    .readdirSync(activeDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${cerebrateTaskId}-`))
    .map((entry) => {
      try {
        return loadTask(configDir, entry.name);
      } catch {
        return undefined;
      }
    })
    .filter((task): task is Task => {
      return task !== undefined
        && (task.status === 'open' || task.status === 'in-progress')
        && task.dependencies.every((dependency) => taskIsComplete(configDir, dependency));
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function findTaskFile(configDir: string, taskId: string): string | undefined {
  const taskDir = findTaskDir(configDir, taskId);
  return taskDir ? path.join(taskDir, TASK_FILE_NAME) : undefined;
}

function findTaskDir(configDir: string, taskId: string): string | undefined {
  for (const dirName of [ACTIVE_TASK_DIR, COMPLETED_TASK_DIR, CANCELLED_TASK_DIR]) {
    const taskDir = path.join(configDir, dirName, taskId);
    const taskFile = path.join(taskDir, TASK_FILE_NAME);
    if (fs.existsSync(taskFile) && fs.statSync(taskFile).isFile()) {
      return taskDir;
    }
  }

  return undefined;
}

function takeNextTaskNumber(configDir: string, cerebrateTaskId: string): number {
  const configPath = findCerebrateConfigPath(configDir, cerebrateTaskId);
  const doc = yaml.parseDocument(fs.readFileSync(configPath, 'utf8'));
  const nextTaskNumber = doc.get('nextTaskNumber');

  if (nextTaskNumber !== undefined && (!Number.isInteger(nextTaskNumber) || Number(nextTaskNumber) < 1)) {
    throw new Error(`Invalid nextTaskNumber in ${configPath}. Expected a positive integer.`);
  }

  const taskNumber = nextTaskNumber === undefined ? 1 : Number(nextTaskNumber);
  doc.set('nextTaskNumber', taskNumber + 1);
  fs.writeFileSync(configPath, doc.toString(), 'utf8');
  return taskNumber;
}

function findCerebrateConfigPath(configDir: string, cerebrateTaskId: string): string {
  const cerebratesDir = path.join(configDir, 'cerebrates');
  if (!fs.existsSync(cerebratesDir)) {
    throw new Error(`Cannot allocate task ID for "${cerebrateTaskId}" because cerebrates/ does not exist.`);
  }

  const matches: string[] = [];
  for (const entry of fs.readdirSync(cerebratesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const configPath = path.join(cerebratesDir, entry.name, CEREBRATE_CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const raw = yaml.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
    if (isConfigForTaskId(raw, cerebrateTaskId)) {
      matches.push(configPath);
    }
  }

  if (matches.length === 0) {
    throw new Error(`No cerebrate config found with taskId "${cerebrateTaskId}".`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple cerebrate configs found with taskId "${cerebrateTaskId}".`);
  }

  return matches[0]!;
}

function isConfigForTaskId(raw: unknown, cerebrateTaskId: string): boolean {
  return typeof raw === 'object'
    && raw !== null
    && 'taskId' in raw
    && (raw as { taskId?: unknown }).taskId === cerebrateTaskId;
}

function moveTaskToStatusDir(configDir: string, task: Task): void {
  const currentDir = findTaskDir(configDir, task.id);
  const targetDir = path.join(configDir, directoryForStatus(task.status), task.id);

  if (currentDir && path.resolve(currentDir) !== path.resolve(targetDir)) {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    if (fs.existsSync(targetDir)) {
      throw new Error(`Cannot move task "${task.id}" because target already exists: ${targetDir}`);
    }
    fs.renameSync(currentDir, targetDir);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, TASK_FILE_NAME), formatTaskMarkdown(task), 'utf8');
}

function directoryForStatus(status: TaskStatus): string {
  if (status === 'complete') {
    return COMPLETED_TASK_DIR;
  }
  if (status === 'cancelled') {
    return CANCELLED_TASK_DIR;
  }
  return ACTIVE_TASK_DIR;
}

function taskIsComplete(configDir: string, taskId: string): boolean {
  return fs.existsSync(path.join(configDir, COMPLETED_TASK_DIR, taskId, TASK_FILE_NAME));
}

function assertChecklistIndex(items: TaskChecklistItem[], index: number, label: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new Error(`Invalid ${label} index ${index}.`);
  }
}

function parseTaskMarkdown(contents: string, expectedTaskId: string): Task {
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

  return {
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

function formatTaskMarkdown(task: Task): string {
  return [
    `# ${task.id}`,
    '',
    `**Status:** ${task.status}`,
    `**Created:** ${task.createdAt}`,
    `**Updated:** ${task.updatedAt}`,
    '',
    '## Description',
    '',
    task.description.trim(),
    '',
    '## Dependencies',
    '',
    formatBullets(task.dependencies),
    '',
    '## Subtasks',
    '',
    formatChecklist(task.subtasks),
    '',
    '## Acceptance Criteria',
    '',
    formatChecklist(task.acceptanceCriteria),
    '',
  ].join('\n');
}

function formatBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '';
}

function formatChecklist(items: TaskChecklistItem[]): string {
  return items.length > 0 ? items.map((item) => `- [${item.done ? 'x' : ' '}] ${item.text}`).join('\n') : '';
}

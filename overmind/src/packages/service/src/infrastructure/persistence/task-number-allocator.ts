import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { CEREBRATE_CONFIG_FILENAME } from '../config/cerebrate-config-loader.js';

export function allocateNextTaskNumber(configDir: string, taskPrefix: string): number {
  const configPath = findCerebrateConfigPath(configDir, taskPrefix);
  const document = yaml.parseDocument(fs.readFileSync(configPath, 'utf8'));
  const nextTaskNumber = document.get('nextTaskNumber');

  if (nextTaskNumber !== undefined && (!Number.isInteger(nextTaskNumber) || Number(nextTaskNumber) < 1)) {
    throw new Error(`Invalid nextTaskNumber in ${configPath}. Expected a positive integer.`);
  }

  const taskNumber = nextTaskNumber === undefined ? 1 : Number(nextTaskNumber);
  document.set('nextTaskNumber', taskNumber + 1);
  fs.writeFileSync(configPath, document.toString(), 'utf8');
  return taskNumber;
}

function findCerebrateConfigPath(configDir: string, taskPrefix: string): string {
  const cerebratesDir = path.join(configDir, 'cerebrates');
  if (!fs.existsSync(cerebratesDir)) {
    throw new Error(`Cannot allocate task ID for "${taskPrefix}" because cerebrates/ does not exist.`);
  }

  const matches: string[] = [];
  for (const entry of fs.readdirSync(cerebratesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const configPath = path.join(cerebratesDir, entry.name, CEREBRATE_CONFIG_FILENAME);
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const raw = yaml.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
    if (isConfigForTaskPrefix(raw, taskPrefix)) {
      matches.push(configPath);
    }
  }

  if (matches.length === 0) {
    throw new Error(`No cerebrate config found with taskId "${taskPrefix}".`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple cerebrate configs found with taskId "${taskPrefix}".`);
  }

  return matches[0]!;
}

function isConfigForTaskPrefix(raw: unknown, taskPrefix: string): boolean {
  return typeof raw === 'object'
    && raw !== null
    && 'taskId' in raw
    && (raw as { taskId?: unknown }).taskId === taskPrefix;
}

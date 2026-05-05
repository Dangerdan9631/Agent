import * as fs from 'node:fs';
import * as path from 'node:path';
import { SkillDefinition, type SkillFile } from '../types/skill';

function readDirRecursive(dir: string, baseDir: string): SkillFile[] {
  const files: SkillFile[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readDirRecursive(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Heuristic: skip binary files (contain null bytes)
        if (!content.includes('\x00')) {
          files.push({ relativePath, content });
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  return files;
}

export function parseSkills(configDir: string): SkillDefinition[] {
  const dir = path.join(configDir, 'skills');
  if (!fs.existsSync(dir)) return [];

  const skills: SkillDefinition[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return skills;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(dir, entry.name);
    const files = readDirRecursive(skillPath, skillPath);
    skills.push(new SkillDefinition(entry.name, skillPath, files));
  }

  return skills;
}

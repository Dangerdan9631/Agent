import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DirectiveTypePlugin, ValidationResult, WriteOptions } from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';
import { parseCommands } from '../directive-parsers/command';

export class CommandDefinition implements InstructionType {
  readonly typeId = 'command';

  constructor(
    public name: string,
    public slug: string,
    public sourcePath: string,
    public body: string,
    public targets?: string[],
    public excludedTargets?: string[],
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.slug) results.push({ level: 'error', message: 'slug is required' });
    if (!this.body) results.push({ level: 'warning', message: 'body is empty' });
    return results;
  }
}

function writeFile(filePath: string, content: string, opts?: WriteOptions): void {
  if (opts?.overwrite === false && fs.existsSync(filePath)) return;
  if (opts?.dryRun) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export const commandDirectiveTypePlugin: DirectiveTypePlugin<CommandDefinition> = {
  typeId: 'command',
  displayName: 'Commands',
  parse(configDir: string): Promise<CommandDefinition[]> {
    return parseCommands(configDir);
  },
  write(items: CommandDefinition[], configDir: string, opts?: WriteOptions): void {
    for (const command of items) {
      writeFile(path.join(configDir, 'commands', `${command.name}.md`), `${command.body}\n`, opts);
    }
  },
  validate(items: CommandDefinition[]): ValidationResult[] {
    void items;
    return [];
  },
};

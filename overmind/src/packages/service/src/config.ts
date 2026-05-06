import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { z } from 'zod';

/** Raw YAML shape before resolving file paths in string fields. */
const cerebrateCommandRawSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const cerebrateConfigRawSchema = z.object({
  description: z.string(),
  responsibilities: z.string(),
  commands: z.array(cerebrateCommandRawSchema),
});

const overmindConfigRawSchema = z.object({
  version: z.number().optional(),
});

export interface ResolvedCerebrateCommand {
  name: string;
  /** Resolved command body (inline or file contents). */
  value: string;
}

export interface ResolvedCerebrateConfig {
  description: string;
  responsibilities: string;
  commands: ResolvedCerebrateCommand[];
}

export type OvermindConfig = z.infer<typeof overmindConfigRawSchema>;

export const DEFAULT_OVERMIND_CONFIG_YAML = `# Overmind service configuration.
version: 1
`;

export const DEFAULT_HELLO_CEREBRATE_YAML = `description: "says hello"
responsibilities: "say hello"
commands:
  - name: hello
    value: "say hello"
`;

/** If \`value\` is a path to an existing file (absolute or relative to \`baseDir\`), read UTF-8 contents; otherwise return the string as-is. */
export function resolveCerebrateValue(baseDir: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const candidates: string[] = [];
  if (path.isAbsolute(trimmed)) {
    candidates.push(trimmed);
  } else {
    candidates.push(path.resolve(baseDir, trimmed));
  }

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        return fs.readFileSync(candidate, 'utf8');
      }
    } catch {
      // Not a readable file — treat as inline text.
    }
  }

  return value;
}

export function loadOvermindConfig(configDir: string): OvermindConfig {
  const configPath = path.join(configDir, 'overmind-config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing overmind-config.yaml at ${configPath}`);
  }

  const raw = yaml.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  const parsed = overmindConfigRawSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new Error(`Invalid overmind-config.yaml: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function loadResolvedCerebrateConfig(cerebrateDir: string): ResolvedCerebrateConfig {
  const configPath = path.join(cerebrateDir, 'cerebrate-config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing cerebrate-config.yaml at ${configPath}`);
  }

  const rawYaml = yaml.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  const parsed = cerebrateConfigRawSchema.safeParse(rawYaml ?? {});
  if (!parsed.success) {
    throw new Error(`Invalid cerebrate-config.yaml at ${configPath}: ${parsed.error.message}`);
  }

  const { description, responsibilities, commands } = parsed.data;

  return {
    description,
    responsibilities: resolveCerebrateValue(cerebrateDir, responsibilities),
    commands: commands.map((cmd) => ({
      name: cmd.name,
      value: resolveCerebrateValue(cerebrateDir, cmd.value),
    })),
  };
}

export function cerebrateDefinitionDir(configDir: string, cerebrateName: string): string {
  return path.join(configDir, 'cerebrates', cerebrateName);
}

function writeFileIfMissing(filePath: string, contents: string): void {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents, 'utf8');
  }
}

/**
 * Ensures \`overmind-config.yaml\` exists and a default \`hello\` cerebrate folder exists with \`cerebrate-config.yaml\`.
 */
export function scaffoldDefaultConfig(configDir: string): void {
  fs.mkdirSync(configDir, { recursive: true });

  const overmindPath = path.join(configDir, 'overmind-config.yaml');
  writeFileIfMissing(overmindPath, DEFAULT_OVERMIND_CONFIG_YAML);

  const helloDir = cerebrateDefinitionDir(configDir, 'hello');
  fs.mkdirSync(helloDir, { recursive: true });

  const helloConfigPath = path.join(helloDir, 'cerebrate-config.yaml');
  writeFileIfMissing(helloConfigPath, DEFAULT_HELLO_CEREBRATE_YAML);
}

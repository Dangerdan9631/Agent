import path from 'node:path';
import fse from 'fs-extra';

import { applyAdditiveTaskTags } from './tags.js';

const LIVING_SPECS_DIR = 'living-specs';

/**
 * Parsed Gherkin scenario with tags, steps, and source line bounds.
 */
export interface GherkinScenario {
  /**
   * Scenario title without the Scenario or Scenario Outline prefix.
   */
  name: string;
  /**
   * Tags applied directly above the scenario declaration.
   */
  tags: string[];
  /**
   * Indented step lines including Given/When/Then keywords.
   */
  steps: string[];
  /**
   * Zero-based start line index in the source file.
   */
  startLine: number;
  /**
   * Zero-based end line index in the source file (exclusive).
   */
  endLine: number;
}

/**
 * Parsed living spec feature file content.
 */
export interface ParsedFeatureFile {
  /**
   * Feature title from the Feature line.
   */
  featureTitle: string;
  /**
   * Tags declared before the Feature line.
   */
  featureTags: string[];
  /**
   * Parsed scenarios in source order.
   */
  scenarios: GherkinScenario[];
  /**
   * Original file content used for round-trip edits.
   */
  rawContent: string;
}

/**
 * Input describing a scenario to add or replace in a feature file.
 */
export interface ScenarioInput {
  /**
   * Scenario title used for matching and rendering.
   */
  name: string;
  /**
   * Indented Gherkin step lines.
   */
  steps: string[];
  /**
   * Optional explicit tags to preserve on the scenario.
   */
  tags?: string[];
}

/**
 * Result of routing a feature description to a living spec file path.
 */
export interface LivingSpecRoute {
  /**
   * Inferred kebab-case domain segment.
   */
  domain: string;
  /**
   * Project-relative path to the target feature file.
   */
  relativePath: string;
  /**
   * Absolute path to the target feature file.
   */
  absolutePath: string;
}

const DOMAIN_RULES: ReadonlyArray<{ pattern: RegExp; domain: string }> = [
  {
    pattern:
      /\b(user\s+)?auth(entication)?|login|oauth|sign[\s-]?in|sign[\s-]?up|two[\s-]?factor\b/i,
    domain: 'user-authentication',
  },
  {
    pattern: /\bpayment|billing|checkout|invoice|credit\s+card|wallet\b/i,
    domain: 'payment-processing',
  },
  {
    pattern: /\border|shipping|fulfillment|delivery|shipment|ships\b/i,
    domain: 'order-management',
  },
  {
    pattern: /\bnotification|email|sms|alert\b/i,
    domain: 'notifications',
  },
  {
    pattern: /\bapi|rest|graphql|endpoint\b/i,
    domain: 'api',
  },
  {
    pattern: /\bsearch|index\b/i,
    domain: 'search',
  },
  {
    pattern: /\bprofile|account|user\s+settings\b/i,
    domain: 'user-profile',
  },
];

const SCENARIO_HEADER_PATTERN = /^\s*(Scenario(?: Outline)?:\s*)(.+)\s*$/;

/**
 * Converts arbitrary text to a kebab-case domain segment.
 *
 * @param text - Source phrase to normalize.
 * @returns Kebab-case domain suitable for feature file naming.
 */
function toKebabDomain(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 4)
    .join('-');

  return normalized.length > 0 ? normalized : 'general';
}

/**
 * Infers the living spec domain from a natural-language feature description.
 *
 * @param description - Feature description used for semantic routing.
 * @returns Kebab-case domain segment for `living-specs/{domain}.feature`.
 */
export function inferDomainFromDescription(description: string): string {
  for (const rule of DOMAIN_RULES) {
    if (rule.pattern.test(description)) {
      return rule.domain;
    }
  }

  const forMatch = description.match(/\bfor\s+([a-z0-9][\w\s-]{2,60})/i);
  if (forMatch?.[1] != null) {
    return toKebabDomain(forMatch[1]);
  }

  return toKebabDomain(description);
}

/**
 * Resolves the absolute path to a living spec feature file for a domain.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param domain - Kebab-case domain segment.
 * @returns Absolute path to `living-specs/{domain}.feature`.
 */
export function resolveLivingSpecPath(projectRoot: string, domain: string): string {
  return path.join(path.resolve(projectRoot), LIVING_SPECS_DIR, `${domain}.feature`);
}

/**
 * Routes a feature description to the target living spec file path.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param description - Natural-language feature description.
 * @returns Domain and relative/absolute feature file paths.
 */
export function routeLivingSpecFile(projectRoot: string, description: string): LivingSpecRoute {
  const domain = inferDomainFromDescription(description);
  const relativePath = path.posix.join(LIVING_SPECS_DIR, `${domain}.feature`);
  return {
    domain,
    relativePath,
    absolutePath: resolveLivingSpecPath(projectRoot, domain),
  };
}

/**
 * Parses tags from a whitespace-delimited Gherkin tag line.
 *
 * @param line - Single source line that may contain one or more `@` tags.
 * @returns Tag strings including leading `@`.
 */
function parseTagLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith('@')) {
    return [];
  }

  return trimmed.split(/\s+/).filter((token) => token.startsWith('@'));
}

/**
 * Parses a living spec `.feature` file into structured scenarios.
 *
 * @param content - Full UTF-8 feature file content.
 * @returns Parsed feature metadata and scenarios.
 */
export function parseFeatureFile(content: string): ParsedFeatureFile {
  const lines = content.split(/\r?\n/);
  let featureTitle = 'Feature';
  const featureTags: string[] = [];
  const scenarios: GherkinScenario[] = [];
  let pendingTags: string[] = [];
  let currentScenario: GherkinScenario | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      if (currentScenario != null) {
        currentScenario.steps.push(line);
      }
      continue;
    }

    const tagMatches = parseTagLine(trimmed);
    if (tagMatches.length > 0 && trimmed.startsWith('@')) {
      pendingTags.push(...tagMatches);
      continue;
    }

    if (trimmed.startsWith('Feature:')) {
      featureTitle = trimmed.replace(/^Feature:\s*/, '').trim() || 'Feature';
      featureTags.push(...pendingTags);
      pendingTags = [];
      continue;
    }

    const scenarioMatch = trimmed.match(SCENARIO_HEADER_PATTERN);
    if (scenarioMatch != null) {
      if (currentScenario != null) {
        currentScenario.endLine = index;
        scenarios.push(currentScenario);
      }

      currentScenario = {
        name: scenarioMatch[2]!.trim(),
        tags: [...pendingTags],
        steps: [],
        startLine: index,
        endLine: lines.length,
      };
      pendingTags = [];
      continue;
    }

    if (currentScenario != null) {
      currentScenario.steps.push(line);
    }
  }

  if (currentScenario != null) {
    currentScenario.endLine = lines.length;
    scenarios.push(currentScenario);
  }

  return {
    featureTitle,
    featureTags,
    scenarios,
    rawContent: content,
  };
}

/**
 * Reads and parses a living spec feature file from disk.
 *
 * @param filePath - Absolute path to the `.feature` file.
 * @returns Parsed feature metadata and scenarios.
 */
export async function readFeatureFile(filePath: string): Promise<ParsedFeatureFile> {
  const content = await fse.readFile(filePath, 'utf8');
  return parseFeatureFile(content);
}

/**
 * Renders a scenario block with tags and indented steps.
 *
 * @param scenario - Scenario input with optional tags.
 * @param taskSpecId - Current task spec id for additive tagging.
 * @returns Gherkin scenario block lines without trailing newline.
 */
function renderScenarioBlock(scenario: ScenarioInput, taskSpecId: string): string {
  const tags = applyAdditiveTaskTags(scenario.tags ?? [], taskSpecId);
  const tagLine = tags.length > 0 ? `  ${tags.join(' ')}\n` : '';
  const stepLines = scenario.steps.map((step) => {
    const trimmed = step.trim();
    return trimmed.startsWith('Given') ||
      trimmed.startsWith('When') ||
      trimmed.startsWith('Then') ||
      trimmed.startsWith('And') ||
      trimmed.startsWith('But')
      ? `    ${trimmed}`
      : `    ${trimmed}`;
  });

  return `${tagLine}  Scenario: ${scenario.name}\n${stepLines.join('\n')}`;
}

/**
 * Creates a new feature file skeleton for a domain.
 *
 * @param domain - Kebab-case domain segment.
 * @returns Initial feature file content.
 */
function createFeatureSkeleton(domain: string): string {
  const title = domain
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return `Feature: ${title}\n\n`;
}

/**
 * Removes named scenarios from feature file content.
 *
 * Deprecated scenarios are deleted entirely; version control is the archive.
 *
 * @param content - Existing feature file content.
 * @param scenarioNames - Scenario titles to remove.
 * @returns Updated feature file content without the named scenarios.
 */
export function removeDeprecatedScenarios(content: string, scenarioNames: string[]): string {
  if (scenarioNames.length === 0) {
    return content;
  }

  const namesToRemove = new Set(scenarioNames);
  const parsed = parseFeatureFile(content);
  const keptScenarios = parsed.scenarios.filter((scenario) => !namesToRemove.has(scenario.name));

  if (keptScenarios.length === parsed.scenarios.length) {
    return content;
  }

  const lines = content.split(/\r?\n/);
  const removeRanges = parsed.scenarios
    .filter((scenario) => namesToRemove.has(scenario.name))
    .map((scenario) => {
      let start = scenario.startLine;
      while (start > 0 && parseTagLine(lines[start - 1]?.trim() ?? '').length > 0) {
        start -= 1;
      }
      return { start, end: scenario.endLine };
    })
    .sort((left, right) => right.start - left.start);

  const mutableLines = [...lines];
  for (const range of removeRanges) {
    mutableLines.splice(range.start, range.end - range.start);
  }

  return (
    mutableLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}

/**
 * Applies scenario additions and updates to feature file content.
 *
 * @param content - Existing feature file content or an empty string for new files.
 * @param domain - Kebab-case domain used when bootstrapping a new file.
 * @param scenariosToAdd - Scenarios appended when not already present.
 * @param scenariosToUpdate - Scenarios replaced by name when present.
 * @param taskSpecId - Current task spec id for additive tagging.
 * @returns Updated feature file content.
 */
export function applyScenarioChanges(
  content: string,
  domain: string,
  scenariosToAdd: ScenarioInput[],
  scenariosToUpdate: ScenarioInput[],
  taskSpecId: string,
): string {
  const baseContent = content.trim().length > 0 ? content : createFeatureSkeleton(domain);
  let working = baseContent.endsWith('\n') ? baseContent : `${baseContent}\n`;
  const parsed = parseFeatureFile(working);
  const existingByName = new Map(parsed.scenarios.map((scenario) => [scenario.name, scenario]));

  for (const update of scenariosToUpdate) {
    const existing = existingByName.get(update.name);
    const mergedTags = applyAdditiveTaskTags(update.tags ?? existing?.tags ?? [], taskSpecId);
    const block = renderScenarioBlock({ ...update, tags: mergedTags }, taskSpecId);

    if (existing != null) {
      const lines = working.split(/\r?\n/);
      let start = existing.startLine;
      while (start > 0 && parseTagLine(lines[start - 1]?.trim() ?? '').length > 0) {
        start -= 1;
      }
      lines.splice(start, existing.endLine - start, ...block.split('\n'));
      working = `${lines.join('\n')}\n`;
      existingByName.delete(update.name);
    } else {
      working = `${working.trimEnd()}\n\n${block}\n`;
    }
  }

  const refreshed = parseFeatureFile(working);
  const presentNames = new Set(refreshed.scenarios.map((scenario) => scenario.name));

  for (const addition of scenariosToAdd) {
    if (presentNames.has(addition.name)) {
      continue;
    }

    const block = renderScenarioBlock(addition, taskSpecId);
    working = `${working.trimEnd()}\n\n${block}\n`;
    presentNames.add(addition.name);
  }

  return working.endsWith('\n') ? working : `${working}\n`;
}

/**
 * Ensures the living-specs directory exists and writes feature file content.
 *
 * @param filePath - Absolute path to the `.feature` file.
 * @param content - Feature file content to persist.
 */
export async function writeFeatureFile(filePath: string, content: string): Promise<void> {
  await fse.ensureDir(path.dirname(filePath));
  await fse.writeFile(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

/**
 * Updates a living spec feature file with routing, tagging, and scenario edits.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param description - Feature description used for domain routing.
 * @param taskSpecId - Current task spec id for additive scenario tags.
 * @param options - Scenario additions, updates, and deprecated removals.
 * @returns Route metadata and whether the file changed.
 */
export async function updateLivingSpecFile(
  projectRoot: string,
  description: string,
  taskSpecId: string,
  options: {
    scenariosToAdd?: ScenarioInput[];
    scenariosToUpdate?: ScenarioInput[];
    deprecatedScenarioNames?: string[];
  },
): Promise<{ route: LivingSpecRoute; livingSpecUpdated: boolean }> {
  const route = routeLivingSpecFile(projectRoot, description);
  const scenariosToAdd = options.scenariosToAdd ?? [];
  const scenariosToUpdate = options.scenariosToUpdate ?? [];
  const deprecatedScenarioNames = options.deprecatedScenarioNames ?? [];

  const fileExists = await fse.pathExists(route.absolutePath);
  const existingContent = fileExists ? await fse.readFile(route.absolutePath, 'utf8') : '';

  let nextContent = existingContent;
  nextContent = removeDeprecatedScenarios(nextContent, deprecatedScenarioNames);
  nextContent = applyScenarioChanges(
    nextContent,
    route.domain,
    scenariosToAdd,
    scenariosToUpdate,
    taskSpecId,
  );

  const livingSpecUpdated = nextContent !== existingContent || !fileExists;
  if (livingSpecUpdated) {
    await writeFeatureFile(route.absolutePath, nextContent);
  }

  return { route, livingSpecUpdated };
}

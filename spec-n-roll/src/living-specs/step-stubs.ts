import path from 'node:path';
import fse from 'fs-extra';

import { parseFeatureFile, readFeatureFile } from './gherkin.js';

/**
 * Marker comment included in every generated stub step definition.
 */
export const STUB_MARKER = '// STUB: requires implementation';

/**
 * Project-relative directory for Cucumber step definitions.
 */
export const STEP_DEFINITIONS_DIR = 'tests/step-definitions';

/**
 * Default stub file name written under the step definitions directory.
 */
const DEFAULT_STUB_FILE = 'living-spec-stubs.mjs';

const STEP_KEYWORD_PATTERN = /^(Given|When|Then|And|But)\s+(.+)$/i;

const STEP_DEFINITION_PATTERN = /(?:Given|When|Then|And|But)\s*\(\s*(['"`])([^'"`]+)\1/g;

const STEP_DEFINITION_CAPTURE = /(?:Given|When|Then|And|But)\s*\(\s*(['"`])([^'"`]+)\1/;

/**
 * Extracts the step text from a single step definition source block.
 *
 * @param block - Step definition source block.
 * @returns Registered step text or null when no pattern is found.
 */
function captureStepPattern(block: string): string | null {
  const match = block.match(STEP_DEFINITION_CAPTURE);
  return match?.[2]?.trim() ?? null;
}

/**
 * Gherkin step text paired with its Cucumber registration keyword.
 */
export interface GherkinStepRef {
  /**
   * Cucumber keyword used to register the step definition.
   */
  keyword: 'Given' | 'When' | 'Then';
  /**
   * Step text without the leading Gherkin keyword.
   */
  text: string;
}

/**
 * Returns the default stub step definition file name.
 *
 * @returns File name for generated living-spec stub definitions.
 */
export function defaultStubFileName(): string {
  return DEFAULT_STUB_FILE;
}

/**
 * Resolves the absolute path to the default stub file in a project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Absolute path to the generated stub step definition file.
 */
export function defaultStubFilePath(projectRoot: string): string {
  return path.join(path.resolve(projectRoot), STEP_DEFINITIONS_DIR, DEFAULT_STUB_FILE);
}

/**
 * Normalizes a Gherkin step line into keyword and step text.
 *
 * @param line - Single indented Gherkin step line.
 * @param lastKeyword - Previous non-And/But keyword in the scenario.
 * @returns Parsed step reference or null when the line is not a step.
 */
function parseStepLine(
  line: string,
  lastKeyword: 'Given' | 'When' | 'Then',
): { step: GherkinStepRef; keyword: 'Given' | 'When' | 'Then' } | null {
  const trimmed = line.trim();
  const match = trimmed.match(STEP_KEYWORD_PATTERN);
  if (match == null) {
    return null;
  }

  const rawKeyword = match[1]!;
  const text = match[2]!.trim();
  const normalized = rawKeyword.toLowerCase();

  if (normalized === 'and' || normalized === 'but') {
    return { step: { keyword: lastKeyword, text }, keyword: lastKeyword };
  }

  const keyword = rawKeyword[0]!.toUpperCase() + rawKeyword.slice(1).toLowerCase();
  if (keyword !== 'Given' && keyword !== 'When' && keyword !== 'Then') {
    return null;
  }

  return { step: { keyword, text }, keyword };
}

/**
 * Extracts unique Gherkin steps from feature file content.
 *
 * @param content - Full UTF-8 `.feature` file content.
 * @returns Unique step references in encounter order.
 */
export function extractGherkinSteps(content: string): GherkinStepRef[] {
  const parsed = parseFeatureFile(content);
  const seen = new Set<string>();
  const steps: GherkinStepRef[] = [];

  for (const scenario of parsed.scenarios) {
    let lastKeyword: 'Given' | 'When' | 'Then' = 'Given';
    for (const line of scenario.steps) {
      const parsedStep = parseStepLine(line, lastKeyword);
      if (parsedStep == null) {
        continue;
      }

      lastKeyword = parsedStep.keyword;
      const key = `${parsedStep.step.keyword}:${parsedStep.step.text}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      steps.push(parsedStep.step);
    }
  }

  return steps;
}

/**
 * Collects step patterns already registered in existing step definition files.
 *
 * @param stepDefinitionsDir - Absolute path to the step definitions directory.
 * @returns Set of registered step texts.
 */
export async function findMappedStepPatterns(stepDefinitionsDir: string): Promise<Set<string>> {
  const mapped = new Set<string>();
  if (!(await fse.pathExists(stepDefinitionsDir))) {
    return mapped;
  }

  const entries = await fse.readdir(stepDefinitionsDir);
  for (const entry of entries) {
    if (!/\.(?:mjs|cjs|js|ts)$/.test(entry)) {
      continue;
    }

    const content = await fse.readFile(path.join(stepDefinitionsDir, entry), 'utf8');
    for (const match of content.matchAll(STEP_DEFINITION_PATTERN)) {
      const pattern = match[2]?.trim();
      if (pattern != null && pattern.length > 0) {
        mapped.add(pattern);
      }
    }
  }

  return mapped;
}

/**
 * Renders a single stub step definition block.
 *
 * @param step - Gherkin step reference to render.
 * @returns Source lines for the stub definition.
 */
export function renderStubStepDefinition(step: GherkinStepRef): string {
  const escaped = step.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `${STUB_MARKER}
${step.keyword}('${escaped}', function () {
  throw new Error('STUB: requires implementation');
});`;
}

/**
 * Generates stub step definition source for unmapped Gherkin steps.
 *
 * @param steps - Gherkin steps discovered in living spec files.
 * @param mappedPatterns - Step texts already registered in the project.
 * @returns Stub definition source blocks for unmapped steps.
 */
export function generateStubStepDefinitions(
  steps: GherkinStepRef[],
  mappedPatterns: Set<string>,
): string[] {
  const stubs: string[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    if (mappedPatterns.has(step.text) || seen.has(step.text)) {
      continue;
    }

    seen.add(step.text);
    stubs.push(renderStubStepDefinition(step));
  }

  return stubs;
}

/**
 * Builds the full stub module source for newly generated steps.
 *
 * @param stubBlocks - Rendered stub definition blocks.
 * @returns ESM module source importing Cucumber step helpers.
 */
export function buildStubModuleSource(stubBlocks: string[]): string {
  if (stubBlocks.length === 0) {
    return '';
  }

  return `import { Given, Then, When } from '@cucumber/cucumber';

${stubBlocks.join('\n\n')}
`;
}

/**
 * Merges new stub blocks into an existing stub module without duplicating patterns.
 *
 * @param existingContent - Current stub module content, if any.
 * @param stubBlocks - Newly rendered stub blocks to append.
 * @returns Combined module source.
 */
export function mergeStubModuleContent(existingContent: string, stubBlocks: string[]): string {
  if (stubBlocks.length === 0) {
    return existingContent;
  }

  const mapped = new Set<string>();
  for (const match of existingContent.matchAll(STEP_DEFINITION_PATTERN)) {
    const pattern = match[2]?.trim();
    if (pattern != null) {
      mapped.add(pattern);
    }
  }

  const newBlocks = stubBlocks.filter((block) => {
    const pattern = captureStepPattern(block);
    return pattern != null && !mapped.has(pattern);
  });

  if (newBlocks.length === 0) {
    return existingContent;
  }

  if (existingContent.trim().length === 0) {
    return buildStubModuleSource(newBlocks);
  }

  return `${existingContent.trimEnd()}\n\n${newBlocks.join('\n\n')}\n`;
}

/**
 * Options for writing stub step definitions for living spec files.
 */
export interface WriteStubStepDefinitionsOptions {
  /**
   * Absolute paths to living spec `.feature` files to scan for steps.
   */
  featureFilePaths: string[];
}

/**
 * Writes or updates stub step definitions for unmapped Gherkin steps.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Feature files to scan for unmapped steps.
 * @returns Number of new stub definitions written and the stub file path.
 */
export async function writeStubStepDefinitions(
  projectRoot: string,
  options: WriteStubStepDefinitionsOptions,
): Promise<{ stubsGenerated: number; stubFilePath: string }> {
  const root = path.resolve(projectRoot);
  const stepDefinitionsDir = path.join(root, STEP_DEFINITIONS_DIR);
  const stubFilePath = path.join(stepDefinitionsDir, DEFAULT_STUB_FILE);
  await fse.ensureDir(stepDefinitionsDir);

  const allSteps: GherkinStepRef[] = [];
  for (const featurePath of options.featureFilePaths) {
    const content = await fse.readFile(featurePath, 'utf8');
    allSteps.push(...extractGherkinSteps(content));
  }

  const mappedPatterns = await findMappedStepPatterns(stepDefinitionsDir);
  const stubBlocks = generateStubStepDefinitions(allSteps, mappedPatterns);
  const existingContent = (await fse.pathExists(stubFilePath))
    ? await fse.readFile(stubFilePath, 'utf8')
    : '';

  const beforeCount = [...existingContent.matchAll(STEP_DEFINITION_PATTERN)].length;
  const merged = mergeStubModuleContent(existingContent, stubBlocks);
  const afterCount = [...merged.matchAll(STEP_DEFINITION_PATTERN)].length;
  const stubsGenerated = afterCount - beforeCount;

  if (merged.trim().length > 0 && merged !== existingContent) {
    await fse.writeFile(stubFilePath, merged.endsWith('\n') ? merged : `${merged}\n`, 'utf8');
  }

  return { stubsGenerated, stubFilePath };
}

/**
 * Reads Gherkin steps from a living spec file on disk.
 *
 * @param featureFilePath - Absolute path to a `.feature` file.
 * @returns Unique step references declared in the file.
 */
export async function readGherkinStepsFromFile(featureFilePath: string): Promise<GherkinStepRef[]> {
  const parsed = await readFeatureFile(featureFilePath);
  return extractGherkinSteps(parsed.rawContent);
}

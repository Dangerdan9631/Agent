import path from 'node:path';

import fse from 'fs-extra';

import {
  discoveryPlanSchema,
  type DiscoveryPlan,
  type DiscoveryPlanBounds,
  type DiscoveryPlanMode,
  type RepositoryWorkflowScope,
} from '../config/schema.js';

export type {
  DiscoveryPlan,
  DiscoveryPlanBounds,
  DiscoveryPlanMode,
  RepositoryWorkflowScope,
} from '../config/schema.js';

/**
 * Default project-relative paths included in onboarding discovery scope.
 */
export const DEFAULT_ONBOARDING_INCLUDED_PATHS = ['src', 'tests', 'docs'] as const;

/**
 * Default project-relative paths omitted from onboarding discovery scope.
 */
export const DEFAULT_ONBOARDING_OMITTED_PATHS = ['dist', 'node_modules'] as const;

/**
 * Default project-relative paths included in drift discovery scope.
 */
export const DEFAULT_DRIFT_INCLUDED_PATHS = ['src', 'tests', 'docs', 'living-specs'] as const;

/**
 * Input for building a discovery plan recommendation before maintainer approval.
 */
export interface DiscoveryPlanBuilderInput {
  /**
   * Repository workflow mode that will consume the plan.
   */
  mode: DiscoveryPlanMode;
  /**
   * Optional maintainer-provided scope hints.
   */
  scope?: RepositoryWorkflowScope;
  /**
   * Optional bounded limits for large repositories.
   */
  bounds?: DiscoveryPlanBounds;
}

/**
 * Deferred scope suggested for a follow-up repository workflow pass.
 */
export interface NextSuggestedScopedRun {
  /**
   * Project-relative paths deferred from the current pass.
   */
  includedPaths: string[];
  /**
   * Maintainer-facing description for the follow-up scoped run.
   */
  description: string;
}

/**
 * Normalizes a project-relative path to forward slashes without trailing separators.
 *
 * @param relativePath - Project-relative path to normalize. Must be a non-empty string.
 * @returns Normalized project-relative path.
 */
export function normalizeProjectRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\/+$/, '') || '.';

  if (normalized.startsWith('/')) {
    throw new Error(`Project-relative path must not be absolute: ${relativePath}`);
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Project-relative path must stay inside the project root: ${relativePath}`);
  }

  return normalized;
}

/**
 * Normalizes and deduplicates a list of project-relative paths.
 *
 * @param paths - Project-relative paths to normalize.
 * @returns Unique normalized paths in first-seen order.
 */
export function normalizeProjectRelativePathList(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of paths) {
    const value = normalizeProjectRelativePath(entry);
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

/**
 * Returns true when a candidate path resolves inside the project root.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param candidatePath - Project-relative path to validate.
 * @returns True when the resolved path is inside the project root.
 */
export function isPathInsideProjectRoot(projectRoot: string, candidatePath: string): boolean {
  const normalized = normalizeProjectRelativePath(candidatePath);
  const resolved = path.resolve(projectRoot, normalized);
  const root = path.resolve(projectRoot);
  const relative = path.relative(root, resolved);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Validates that every path in a list stays inside the project root.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param paths - Project-relative paths to validate.
 * @returns Normalized paths when all entries are inside the project root.
 */
export function assertPathsInsideProjectRoot(
  projectRoot: string,
  paths: readonly string[],
): string[] {
  const normalized = normalizeProjectRelativePathList(paths);

  for (const entry of normalized) {
    if (!isPathInsideProjectRoot(projectRoot, entry)) {
      throw new Error(`Discovery path escapes project root: ${entry}`);
    }
  }

  return normalized;
}

/**
 * Parses and validates a discovery plan object.
 *
 * @param input - Discovery plan fields to validate.
 * @returns Parsed discovery plan.
 */
export function createDiscoveryPlan(input: DiscoveryPlan): DiscoveryPlan {
  return discoveryPlanSchema.parse(input);
}

/**
 * Merges optional maintainer scope hints into included and omitted path lists.
 *
 * @param scope - Optional maintainer-provided scope input.
 * @returns Included and omitted path lists with normalized project-relative paths.
 */
export function resolveScopePathLists(scope?: RepositoryWorkflowScope): {
  includedPaths: string[];
  omittedPaths: string[];
} {
  return {
    includedPaths: normalizeProjectRelativePathList(scope?.includedPaths ?? []),
    omittedPaths: normalizeProjectRelativePathList(scope?.omittedPaths ?? []),
  };
}

/**
 * Normalizes and validates a maintainer-approved discovery plan before analysis begins.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param approvedPlan - Maintainer-approved discovery plan to normalize.
 * @returns Parsed discovery plan with normalized in-root paths.
 */
export function normalizeApprovedDiscoveryPlan(
  projectRoot: string,
  approvedPlan: DiscoveryPlan,
): DiscoveryPlan {
  return createDiscoveryPlan({
    ...approvedPlan,
    includedPaths: assertPathsInsideProjectRoot(projectRoot, approvedPlan.includedPaths),
    omittedPaths: assertPathsInsideProjectRoot(projectRoot, approvedPlan.omittedPaths),
    livingSpecTargets: assertPathsInsideProjectRoot(projectRoot, approvedPlan.livingSpecTargets),
    documentationSources: assertPathsInsideProjectRoot(
      projectRoot,
      approvedPlan.documentationSources,
    ),
  });
}

/**
 * Recommends a discovery plan with defaults, maintainer scope hints, and optional bounds.
 *
 * @param input - Project root, workflow mode, and optional scope or bounds hints.
 * @returns Parsed discovery plan ready for maintainer approval.
 */
export async function recommendDiscoveryPlan(
  input: DiscoveryPlanBuilderInput & { projectRoot: string },
): Promise<DiscoveryPlan> {
  const projectRoot = path.resolve(input.projectRoot);
  const scopePaths = resolveScopePathLists(input.scope);
  const isDrift = input.mode === 'repository-drift';
  const defaultIncluded = isDrift
    ? [...DEFAULT_DRIFT_INCLUDED_PATHS]
    : [...DEFAULT_ONBOARDING_INCLUDED_PATHS];
  const defaultOmitted = [...DEFAULT_ONBOARDING_OMITTED_PATHS];

  let includedPaths =
    scopePaths.includedPaths.length > 0 ? scopePaths.includedPaths : defaultIncluded;
  let omittedPaths = scopePaths.omittedPaths.length > 0 ? scopePaths.omittedPaths : defaultOmitted;

  const productAreaPaths = await discoverProductAreaPaths(projectRoot);
  const bounded = applyDiscoveryPlanBounds({
    includedPaths,
    omittedPaths,
    productAreaPaths,
    bounds: input.bounds ?? {},
  });
  includedPaths = bounded.includedPaths;
  omittedPaths = bounded.omittedPaths;

  const documentationSources = await resolveDocumentationSources(projectRoot, includedPaths);
  const livingSpecTargets = await resolveLivingSpecTargets(
    projectRoot,
    input.scope?.livingSpecTargets ?? [],
    includedPaths,
  );

  return createDiscoveryPlan({
    mode: input.mode,
    includedPaths: assertPathsInsideProjectRoot(projectRoot, includedPaths),
    omittedPaths: assertPathsInsideProjectRoot(projectRoot, omittedPaths),
    livingSpecTargets: assertPathsInsideProjectRoot(projectRoot, livingSpecTargets),
    testMappingStrategy: isDrift
      ? 'Compare living specs to current code and behavior-facing tests.'
      : 'Map behavior-facing tests first, then mark gaps.',
    documentationSources: assertPathsInsideProjectRoot(projectRoot, documentationSources),
    reviewCheckpoints: isDrift
      ? ['approve discovery scope', 'resolve authority conflicts', 'complete specify interview']
      : ['approve discovery scope', 'complete specify interview'],
    bounds: input.bounds ?? {},
  });
}

/**
 * Builds a follow-up scoped run recommendation from deferred discovery paths.
 *
 * @param omittedPaths - Project-relative paths deferred from the current pass.
 * @returns Follow-up scoped run suggestion when deferred paths exist.
 */
export function buildNextSuggestedScopedRun(
  omittedPaths: readonly string[],
): NextSuggestedScopedRun | undefined {
  const deferredAreaPaths = omittedPaths.filter((entry) => entry.startsWith('src/areas/'));
  if (deferredAreaPaths.length === 0) {
    return undefined;
  }

  return {
    includedPaths: [...deferredAreaPaths],
    description:
      'Run a follow-up onboarding pass for deferred product areas recorded in the discovery plan.',
  };
}

/**
 * Applies product-area bounds to discovery scope for large repositories.
 *
 * @param input - Current scope paths, discovered product areas, and bounds.
 * @returns Included and omitted paths after bounds are applied.
 */
export function applyDiscoveryPlanBounds(input: {
  includedPaths: readonly string[];
  omittedPaths: readonly string[];
  productAreaPaths: readonly string[];
  bounds: DiscoveryPlanBounds;
}): { includedPaths: string[]; omittedPaths: string[] } {
  const maxProductAreas = input.bounds.maxProductAreas;
  if (maxProductAreas == null || input.productAreaPaths.length <= maxProductAreas) {
    return {
      includedPaths: [...input.includedPaths],
      omittedPaths: [...input.omittedPaths],
    };
  }

  const includedAreas = input.productAreaPaths.slice(0, maxProductAreas);
  const omittedAreas = input.productAreaPaths.slice(maxProductAreas);
  const includedTestPaths = includedAreas.map((areaPath) => productAreaTestPath(areaPath));
  const omittedTestPaths = omittedAreas.map((areaPath) => productAreaTestPath(areaPath));
  const otherIncluded = input.includedPaths.filter((entry) => entry !== 'src' && entry !== 'tests');

  return {
    includedPaths: normalizeProjectRelativePathList([
      ...includedAreas,
      ...includedTestPaths,
      ...otherIncluded,
    ]),
    omittedPaths: normalizeProjectRelativePathList([
      ...input.omittedPaths,
      ...omittedAreas,
      ...omittedTestPaths,
    ]),
  };
}

/**
 * Resolves documentation source directories that exist within included discovery paths.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param includedPaths - Project-relative paths included in discovery scope.
 * @returns Existing documentation directories or markdown files in scope.
 */
async function resolveDocumentationSources(
  projectRoot: string,
  includedPaths: readonly string[],
): Promise<string[]> {
  const candidates = ['docs', 'README.md', ...includedPaths];
  const sources: string[] = [];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\\/g, '/');
    if (sources.includes(normalized)) {
      continue;
    }

    if (await fse.pathExists(path.join(projectRoot, normalized))) {
      sources.push(normalized);
    }
  }

  return sources;
}

/**
 * Resolves living-spec targets for repository drift discovery plans.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param explicitTargets - Maintainer-provided living-spec targets.
 * @param includedPaths - Project-relative paths included in discovery scope.
 * @returns Living-spec feature file paths in scope for drift analysis.
 */
async function resolveLivingSpecTargets(
  projectRoot: string,
  explicitTargets: readonly string[],
  includedPaths: readonly string[],
): Promise<string[]> {
  if (explicitTargets.length > 0) {
    return [...explicitTargets];
  }

  const livingSpecsDir = path.join(projectRoot, 'living-specs');
  if (!(await fse.pathExists(livingSpecsDir))) {
    return includedPaths.includes('living-specs') ? ['living-specs'] : [];
  }

  const featureFiles: string[] = [];

  async function walk(currentPath: string, relativePrefix: string): Promise<void> {
    const entries = await fse.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath =
        relativePrefix.length > 0 ? `${relativePrefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (entry.isFile() && entry.name.endsWith('.feature')) {
        featureFiles.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }

  await walk(livingSpecsDir, 'living-specs');
  return featureFiles;
}

/**
 * Discovers product-area source directories under `src/areas/`.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Sorted project-relative product-area paths.
 */
async function discoverProductAreaPaths(projectRoot: string): Promise<string[]> {
  const areasRoot = path.join(projectRoot, 'src', 'areas');
  if (!(await fse.pathExists(areasRoot))) {
    return [];
  }

  const entries = await fse.readdir(areasRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `src/areas/${entry.name}`)
    .sort();
}

/**
 * Maps a product-area source path to its behavior-facing test path.
 *
 * @param areaPath - Project-relative product-area source path.
 * @returns Matching project-relative test path for the area.
 */
function productAreaTestPath(areaPath: string): string {
  const areaName = areaPath.split('/').at(-1);
  if (areaName == null || areaName.length === 0) {
    throw new Error(`Invalid product area path: ${areaPath}`);
  }

  return `tests/areas/${areaName}.test.ts`;
}

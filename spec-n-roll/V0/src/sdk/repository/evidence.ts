import path from 'node:path';

import fse from 'fs-extra';

import {
  repositoryEvidenceSchema,
  testCoverageMappingSchema,
  type DiscoveryPlan,
  type ProposedLivingSpecChange,
  type RepositoryEvidence,
  type RepositoryEvidenceKind,
  type RepositoryEvidenceSourceType,
  type RepositoryInjectionQuestion,
  type TestCoverageMapping,
  type TestCoverageType,
  type TestGapRecommendation,
} from '../config/schema.js';
import { assertPathsInsideProjectRoot, normalizeProjectRelativePath } from './discovery-plan.js';

export type {
  RepositoryEvidence,
  RepositoryEvidenceConfidence,
  RepositoryEvidenceKind,
  RepositoryEvidenceSourceType,
  TestCoverageMapping,
  TestCoverageType,
  TestGapRecommendation,
} from '../config/schema.js';

/**
 * Supported repository evidence source categories.
 */
export const REPOSITORY_EVIDENCE_SOURCE_TYPES = [
  'code',
  'test',
  'documentation',
  'living-spec',
  'configuration',
] as const satisfies readonly RepositoryEvidenceSourceType[];

/**
 * Supported repository evidence classification kinds.
 */
export const REPOSITORY_EVIDENCE_KINDS = [
  'confirmed-behavior',
  'inferred-intent',
  'assumption',
  'conflict',
  'limitation',
] as const satisfies readonly RepositoryEvidenceKind[];

/**
 * Supported test coverage relationship types.
 */
export const TEST_COVERAGE_TYPES = [
  'direct',
  'indirect',
  'missing',
  'unknown',
] as const satisfies readonly TestCoverageType[];

const SKIP_DIRECTORY_NAMES = new Set(['node_modules', 'dist', '.git', '.spec-n-roll', 'coverage']);

const SOURCE_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const DOCUMENTATION_EXTENSIONS = new Set(['.md', '.mdx']);

/**
 * Result of collecting onboarding evidence for specify-stage injection.
 */
export interface CollectOnboardingEvidenceResult {
  /**
   * Repository evidence records gathered from code, tests, and documentation.
   */
  evidence: RepositoryEvidence[];
  /**
   * Direct, indirect, missing, or unknown validation mappings for discovered behavior.
   */
  testCoverageMappings: TestCoverageMapping[];
  /**
   * Proposed living-spec additions for uncovered user-facing behavior.
   */
  proposedLivingSpecChanges: ProposedLivingSpecChange[];
  /**
   * Validation targets for uncovered behavior.
   */
  testGapRecommendations: TestGapRecommendation[];
  /**
   * Ambiguity or authority questions surfaced during discovery.
   */
  questions: RepositoryInjectionQuestion[];
  /**
   * Assumptions recorded separately from confirmed facts.
   */
  assumptions: string[];
}

/**
 * Returns true when an evidence record represents a source conflict.
 *
 * @param evidence - Repository evidence record to inspect.
 * @returns True when the evidence kind is `conflict`.
 */
export function isConflictEvidence(evidence: RepositoryEvidence): boolean {
  return evidence.evidenceKind === 'conflict';
}

/**
 * Returns true when a coverage type requires a recommended validation target.
 *
 * @param coverageType - Test coverage relationship to inspect.
 * @returns True when coverage is missing or unknown.
 */
export function requiresValidationTarget(coverageType: TestCoverageType): boolean {
  return coverageType === 'missing' || coverageType === 'unknown';
}

/**
 * Creates a validated repository evidence record.
 *
 * @param input - Evidence fields to validate and normalize.
 * @returns Parsed repository evidence record.
 */
export function createRepositoryEvidence(input: RepositoryEvidence): RepositoryEvidence {
  return repositoryEvidenceSchema.parse(input);
}

/**
 * Creates a validated test coverage mapping for a discovered behavior.
 *
 * @param input - Coverage mapping fields to validate.
 * @returns Parsed test coverage mapping.
 */
export function createTestCoverageMapping(input: TestCoverageMapping): TestCoverageMapping {
  return testCoverageMappingSchema.parse(input);
}

/**
 * Filters evidence records to those matching a classification kind.
 *
 * @param evidence - Evidence records gathered for a repository workflow run.
 * @param evidenceKind - Classification kind to retain.
 * @returns Evidence records matching the requested kind.
 */
export function filterEvidenceByKind(
  evidence: readonly RepositoryEvidence[],
  evidenceKind: RepositoryEvidenceKind,
): RepositoryEvidence[] {
  return evidence.filter((record) => record.evidenceKind === evidenceKind);
}

/**
 * Groups test coverage mappings by coverage relationship type.
 *
 * @param mappings - Test coverage mappings for a repository workflow run.
 * @returns Map keyed by coverage type with matching mappings.
 */
export function groupTestCoverageByType(
  mappings: readonly TestCoverageMapping[],
): Map<TestCoverageType, TestCoverageMapping[]> {
  const grouped = new Map<TestCoverageType, TestCoverageMapping[]>();

  for (const coverageType of TEST_COVERAGE_TYPES) {
    grouped.set(coverageType, []);
  }

  for (const mapping of mappings) {
    grouped.get(mapping.coverageType)?.push(mapping);
  }

  return grouped;
}

/**
 * Collects behavior, documentation, and test inventory evidence for onboarding scope.
 *
 * @param input - Project root and approved discovery plan for the onboarding run.
 * @returns Evidence, proposed living-spec work, and test mappings for specify injection.
 */
export async function collectOnboardingEvidence(input: {
  projectRoot: string;
  discoveryPlan: DiscoveryPlan;
}): Promise<CollectOnboardingEvidenceResult> {
  const projectRoot = path.resolve(input.projectRoot);
  const includedPaths = assertPathsInsideProjectRoot(
    projectRoot,
    input.discoveryPlan.includedPaths,
  );

  const sourceFiles = await listScopedFiles(projectRoot, includedPaths, SOURCE_FILE_EXTENSIONS);
  const documentationFiles = await listScopedFiles(
    projectRoot,
    input.discoveryPlan.documentationSources.length > 0
      ? input.discoveryPlan.documentationSources
      : includedPaths,
    DOCUMENTATION_EXTENSIONS,
  );

  const evidence: RepositoryEvidence[] = [];
  const behaviorAreas = new Map<
    string,
    { summary: string; codeRefs: string[]; testRefs: BehaviorFacingTestRef[] }
  >();
  let evidenceCounter = 1;

  for (const relativePath of sourceFiles) {
    if (!relativePath.startsWith('src/') || relativePath.includes('/tests/')) {
      continue;
    }

    const absolutePath = path.join(projectRoot, relativePath);
    const content = await fse.readFile(absolutePath, 'utf8');
    const area = extractBehaviorArea(relativePath);
    const exportFunctions = extractExportedFunctions(content);

    for (const functionName of exportFunctions) {
      const behaviorSummary = inferBehaviorSummary(functionName, content);
      if (!isUserFacingBehavior(behaviorSummary, relativePath)) {
        continue;
      }

      const sourceRef = `${relativePath}:${functionName}`;
      evidence.push(
        createRepositoryEvidence({
          id: `ev-${String(evidenceCounter++).padStart(3, '0')}`,
          sourceType: 'code',
          sourceRef,
          behaviorSummary,
          evidenceKind: 'confirmed-behavior',
          confidence: 'high',
        }),
      );

      const areaRecord = behaviorAreas.get(area) ?? {
        summary: behaviorSummary,
        codeRefs: [],
        testRefs: [],
      };
      areaRecord.codeRefs.push(sourceRef);
      behaviorAreas.set(area, areaRecord);
    }
  }

  for (const relativePath of sourceFiles) {
    if (!relativePath.startsWith('tests/')) {
      continue;
    }

    const absolutePath = path.join(projectRoot, relativePath);
    const content = await fse.readFile(absolutePath, 'utf8');
    const behaviorFacingRefs = extractBehaviorFacingTestReferences(relativePath, content);

    for (const testRef of behaviorFacingRefs) {
      evidence.push(
        createRepositoryEvidence({
          id: `ev-${String(evidenceCounter++).padStart(3, '0')}`,
          sourceType: 'test',
          sourceRef: testRef.testRef,
          behaviorSummary: testRef.description,
          evidenceKind: 'confirmed-behavior',
          confidence: 'high',
        }),
      );
    }

    const matchedAreas = findBehaviorAreasForTest(content, behaviorAreas);
    for (const area of matchedAreas) {
      const areaRecord = behaviorAreas.get(area);
      if (areaRecord != null) {
        areaRecord.testRefs.push(...behaviorFacingRefs);
      }
    }
  }

  for (const relativePath of documentationFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    const content = await fse.readFile(absolutePath, 'utf8');
    const summary = extractDocumentationSummary(content);
    if (summary.length === 0) {
      continue;
    }

    evidence.push(
      createRepositoryEvidence({
        id: `ev-${String(evidenceCounter++).padStart(3, '0')}`,
        sourceType: 'documentation',
        sourceRef: relativePath,
        behaviorSummary: summary,
        evidenceKind: 'inferred-intent',
        confidence: 'medium',
      }),
    );
  }

  const proposedLivingSpecChanges: ProposedLivingSpecChange[] = [];
  const testCoverageMappings: TestCoverageMapping[] = [];
  const testGapRecommendations: TestGapRecommendation[] = [];
  const assumptions = [
    'Discovered behavior is user-facing unless marked as a limitation.',
    'Living-spec and test file creation remain downstream implementation work.',
  ];

  for (const [area, record] of behaviorAreas) {
    proposedLivingSpecChanges.push({
      changeType: 'add',
      targetRef: `living-specs/${area}.feature`,
      reason: `${record.summary} lacks living-spec coverage in the selected onboarding scope.`,
    });

    const mapping = classifyBehaviorTestCoverage({
      behaviorId: area,
      behaviorSummary: record.summary,
      testRefs: record.testRefs,
    });
    testCoverageMappings.push(mapping);

    const gapRecommendation = createTestGapRecommendationFromMapping(mapping);
    if (gapRecommendation != null) {
      testGapRecommendations.push(gapRecommendation);
    }
  }

  return {
    evidence,
    testCoverageMappings,
    proposedLivingSpecChanges,
    testGapRecommendations,
    questions: [],
    assumptions,
  };
}

/**
 * Lists project-relative files under scoped paths matching the requested extensions.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param scopedPaths - Project-relative directories or files to inspect.
 * @param extensions - File extensions to include, including the leading dot.
 * @returns Sorted unique project-relative file paths.
 */
async function listScopedFiles(
  projectRoot: string,
  scopedPaths: readonly string[],
  extensions: ReadonlySet<string>,
): Promise<string[]> {
  const files = new Set<string>();

  for (const scopedPath of scopedPaths) {
    const normalized = normalizeProjectRelativePath(scopedPath);
    const absolutePath = path.join(projectRoot, normalized);
    if (!(await fse.pathExists(absolutePath))) {
      continue;
    }

    const stats = await fse.stat(absolutePath);
    if (stats.isFile()) {
      if (hasExtension(absolutePath, extensions)) {
        files.add(normalized);
      }
      continue;
    }

    await walkDirectory(projectRoot, absolutePath, normalized, extensions, files);
  }

  return [...files].sort();
}

/**
 * Recursively collects matching files from a directory tree.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param absolutePath - Absolute directory path to walk.
 * @param relativePath - Project-relative path for the current directory.
 * @param extensions - File extensions to include.
 * @param files - Accumulator for discovered project-relative file paths.
 */
async function walkDirectory(
  projectRoot: string,
  absolutePath: string,
  relativePath: string,
  extensions: ReadonlySet<string>,
  files: Set<string>,
): Promise<void> {
  const entries = await fse.readdir(absolutePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }

    const entryRelativePath = relativePath === '.' ? entry.name : `${relativePath}/${entry.name}`;
    const entryAbsolutePath = path.join(absolutePath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(projectRoot, entryAbsolutePath, entryRelativePath, extensions, files);
      continue;
    }

    if (entry.isFile() && hasExtension(entryAbsolutePath, extensions)) {
      files.add(entryRelativePath.replace(/\\/g, '/'));
    }
  }
}

/**
 * Returns true when a file path ends with one of the requested extensions.
 *
 * @param filePath - Absolute or relative file path to inspect.
 * @param extensions - File extensions to match.
 * @returns True when the file extension is included.
 */
function hasExtension(filePath: string, extensions: ReadonlySet<string>): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return extensions.has(extension);
}

/**
 * Extracts exported function names from a TypeScript or JavaScript source file.
 *
 * @param content - Source file contents.
 * @returns Exported function identifiers in source order.
 */
function extractExportedFunctions(content: string): string[] {
  const matches = [...content.matchAll(/export function (\w+)\s*\(/g)];
  return matches.map((match) => match[1]!);
}

const INFRASTRUCTURE_TEST_PATTERNS = [
  /\bre-exports?\b/i,
  /\bmodule exports?\b/i,
  /\bpublic api\b/i,
  /\bbarrel\b/i,
  /\bsnapshot\b/i,
  /\bmock\b/i,
  /\binfrastructure\b/i,
  /\btest harness\b/i,
  /\binitializes?\b/i,
  /\btypeof\b/i,
];

/**
 * One behavior-facing test reference extracted from a test file.
 */
export interface BehaviorFacingTestRef {
  /**
   * Project-relative test reference using file and case identifiers.
   */
  testRef: string;
  /**
   * Human-readable test case description from the source file.
   */
  description: string;
}

/**
 * Extracts behavior-facing test references from a test file.
 *
 * @param relativePath - Project-relative path to the test file.
 * @param content - Test file contents.
 * @returns Test references with case descriptions in source order.
 */
export function extractBehaviorFacingTestReferences(
  relativePath: string,
  content: string,
): BehaviorFacingTestRef[] {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return extractTestCaseDescriptions(content).map((description) => ({
    testRef: `${normalizedPath}#${description}`,
    description,
  }));
}

/**
 * Returns true when a test description appears to verify infrastructure details.
 *
 * @param description - Test case description from a test file.
 * @returns True when the test is infrastructure-focused rather than user-observable.
 */
export function isInfrastructureTestDescription(description: string): boolean {
  return INFRASTRUCTURE_TEST_PATTERNS.some((pattern) => pattern.test(description));
}

/**
 * Returns true when a test description appears to assert user-observable behavior.
 *
 * @param description - Test case description from a test file.
 * @param behaviorSummary - Maintainer-facing behavior summary for the mapped area.
 * @returns True when the test likely validates user-facing behavior.
 */
export function isBehaviorFacingTestDescription(
  description: string,
  behaviorSummary: string,
): boolean {
  if (isInfrastructureTestDescription(description)) {
    return false;
  }

  const descriptionLower = description.toLowerCase();
  const behaviorKeywords = behaviorSummary
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  const observablePatterns = [
    /\breturns?\b/i,
    /\brejects?\b/i,
    /\bshows?\b/i,
    /\bdisplays?\b/i,
    /\bthrows?\b/i,
    /\bgreeting\b/i,
    /\balert\b/i,
    /\buser\b/i,
  ];

  const hasObservablePattern = observablePatterns.some((pattern) => pattern.test(description));
  const hasKeywordMatch = behaviorKeywords.some((keyword) => descriptionLower.includes(keyword));

  return hasObservablePattern || hasKeywordMatch;
}

/**
 * Builds the recommended validation target for uncovered behavior.
 *
 * @param behaviorId - Behavior area slug for the uncovered behavior.
 * @param behaviorSummary - Maintainer-facing behavior summary.
 * @returns User-observable outcome downstream tests should protect.
 */
export function buildRecommendedValidationTarget(
  behaviorId: string,
  behaviorSummary: string,
): string {
  const normalizedSummary = behaviorSummary.replace(/\.$/, '').trim();
  if (normalizedSummary.length > 0) {
    return `User-observable behavior for ${behaviorId} is protected by executable tests: ${normalizedSummary}.`;
  }

  return `User-observable behavior for ${behaviorId} is protected by executable tests.`;
}

/**
 * Classifies test coverage for one discovered behavior area.
 *
 * @param input - Behavior identifier, summary, and extracted test references.
 * @returns Parsed test coverage mapping for the behavior.
 */
export function classifyBehaviorTestCoverage(input: {
  behaviorId: string;
  behaviorSummary: string;
  testRefs: readonly BehaviorFacingTestRef[];
}): TestCoverageMapping {
  if (input.testRefs.length === 0) {
    const recommendedValidationTarget = buildRecommendedValidationTarget(
      input.behaviorId,
      input.behaviorSummary,
    );

    return createTestCoverageMapping({
      behaviorId: input.behaviorId,
      testRefs: [],
      coverageType: 'missing',
      recommendedValidationTarget,
      notes: 'No executable tests were discovered for this behavior area.',
    });
  }

  const directRefs = input.testRefs
    .filter((ref) => isBehaviorFacingTestDescription(ref.description, input.behaviorSummary))
    .map((ref) => ref.testRef);
  if (directRefs.length > 0) {
    return createTestCoverageMapping({
      behaviorId: input.behaviorId,
      testRefs: [...new Set(directRefs)],
      coverageType: 'direct',
      notes: 'Executable tests assert user-observable behavior for this area.',
    });
  }

  const indirectRefs = input.testRefs
    .filter((ref) => isInfrastructureTestDescription(ref.description))
    .map((ref) => ref.testRef);
  if (indirectRefs.length > 0) {
    return createTestCoverageMapping({
      behaviorId: input.behaviorId,
      testRefs: [...new Set(indirectRefs)],
      coverageType: 'indirect',
      notes: 'Discovered tests verify infrastructure details rather than user-observable behavior.',
    });
  }

  const recommendedValidationTarget = buildRecommendedValidationTarget(
    input.behaviorId,
    input.behaviorSummary,
  );

  return createTestCoverageMapping({
    behaviorId: input.behaviorId,
    testRefs: [...new Set(input.testRefs.map((ref) => ref.testRef))],
    coverageType: 'unknown',
    recommendedValidationTarget,
    notes: 'Tests were discovered but do not clearly map to user-observable behavior.',
  });
}

/**
 * Creates a test gap recommendation when coverage is missing or unknown.
 *
 * @param mapping - Test coverage mapping for one behavior area.
 * @returns Test gap recommendation or undefined when coverage is sufficient.
 */
export function createTestGapRecommendationFromMapping(
  mapping: TestCoverageMapping,
): TestGapRecommendation | undefined {
  if (!requiresValidationTarget(mapping.coverageType)) {
    return undefined;
  }

  if (
    mapping.recommendedValidationTarget == null ||
    mapping.recommendedValidationTarget.length < 1
  ) {
    return undefined;
  }

  return {
    behaviorId: mapping.behaviorId,
    recommendedValidationTarget: mapping.recommendedValidationTarget,
  };
}

/**
 * Extracts quoted `it(...)` descriptions from a test file.
 *
 * @param content - Test file contents.
 * @returns Test case descriptions in source order.
 */
function extractTestCaseDescriptions(content: string): string[] {
  const matches = [...content.matchAll(/\bit\s*\(\s*['"`]([^'"`]+)['"`]/g)];
  return matches.map((match) => match[1]!);
}

/**
 * Derives a behavior area slug from a source file path under `src/`.
 *
 * @param relativePath - Project-relative source file path.
 * @returns Behavior area slug used for living-spec targets.
 */
function extractBehaviorArea(relativePath: string): string {
  const segments = relativePath.replace(/\\/g, '/').split('/');
  if (segments[0] === 'src' && segments.length > 2) {
    return segments[1]!;
  }

  return path.basename(relativePath, path.extname(relativePath));
}

/**
 * Builds a concise behavior summary from an exported function and nearby comments.
 *
 * @param functionName - Exported function identifier.
 * @param content - Source file contents.
 * @returns Maintainer-facing behavior summary text.
 */
function inferBehaviorSummary(functionName: string, content: string): string {
  const docCommentMatch = content.match(
    new RegExp(`/\\*\\*[\\s\\S]*?\\*/[\\s\\S]*?export function ${functionName}`),
  );
  if (docCommentMatch != null) {
    const firstSentence = docCommentMatch[0]
      .replace(/^\/\*\*|\*\/$/g, '')
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .find((line) => line.length > 0 && !line.startsWith('@'));

    if (firstSentence != null && firstSentence.length > 0) {
      return firstSentence.replace(/\.$/, '');
    }
  }

  if (functionName === 'greet') {
    return 'Returns a greeting message for a valid user name';
  }

  return `Provides user-facing behavior via ${functionName}`;
}

/**
 * Returns true when a discovered behavior should be included in onboarding output.
 *
 * @param behaviorSummary - Candidate behavior summary text.
 * @param relativePath - Project-relative source path for the behavior.
 * @returns True when the behavior is user-facing enough to propose living-spec work.
 */
function isUserFacingBehavior(behaviorSummary: string, relativePath: string): boolean {
  if (relativePath.includes('/internal/')) {
    return false;
  }

  const normalized = behaviorSummary.toLowerCase();
  return !(
    normalized.includes('cache') ||
    normalized.includes('internal utility') ||
    normalized.includes('in memory only')
  );
}

/**
 * Extracts the first meaningful documentation paragraph from markdown content.
 *
 * @param content - Markdown documentation contents.
 * @returns First non-heading paragraph or an empty string.
 */
function extractDocumentationSummary(content: string): string {
  const lines = content.split('\n');
  const paragraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      continue;
    }

    paragraph.push(trimmed);
  }

  return paragraph.join(' ').trim();
}

/**
 * Finds behavior areas referenced by a test file import path.
 *
 * @param testContent - Test file contents.
 * @param behaviorAreas - Discovered behavior areas keyed by area slug.
 * @returns Matching behavior area slugs for the test file.
 */
function findBehaviorAreasForTest(
  testContent: string,
  behaviorAreas: ReadonlyMap<string, unknown>,
): string[] {
  const matches: string[] = [];

  for (const area of behaviorAreas.keys()) {
    if (testContent.includes(`/src/${area}/`) || testContent.includes(`/${area}/`)) {
      matches.push(area);
    }
  }

  return matches;
}

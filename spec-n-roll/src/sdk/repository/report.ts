import path from 'node:path';

import fse from 'fs-extra';

import type {
  DiscoveryPlan,
  DriftFinding,
  RepositoryEvidence,
  TestCoverageMapping,
  TestGapRecommendation,
} from '../config/schema.js';
import { taskSpecFilePath, taskSpecRelativeDir } from '../core/paths.js';
import type { NextSuggestedScopedRun } from './discovery-plan.js';

/**
 * Filename for a completed repository workflow run report within a task spec directory.
 */
export const REPOSITORY_WORKFLOW_REPORT_FILENAME = 'repository-workflow-report.md';

/**
 * Required markdown sections for a repository workflow report artifact.
 */
export const REPOSITORY_WORKFLOW_REPORT_SECTIONS = [
  'scope',
  'specify-output',
  'evidence',
  'drift-findings',
  'test-gaps',
  'assumptions',
  'limitations',
  'next-steps',
] as const;

/**
 * Identifier for a required repository workflow report section heading.
 */
export type RepositoryWorkflowReportSection = (typeof REPOSITORY_WORKFLOW_REPORT_SECTIONS)[number];

/**
 * Maintainer-facing headings for required repository workflow report sections.
 */
export const REPOSITORY_WORKFLOW_REPORT_SECTION_HEADINGS: Readonly<
  Record<RepositoryWorkflowReportSection, string>
> = {
  scope: 'Scope',
  'specify-output': 'Specify Output',
  evidence: 'Evidence Summary',
  'drift-findings': 'Drift Findings',
  'test-gaps': 'Test Gaps',
  assumptions: 'Assumptions',
  limitations: 'Limitations',
  'next-steps': 'Recommended Next Steps',
};

/**
 * Input for rendering a repository workflow report artifact.
 */
export interface RepositoryWorkflowReportRenderInput {
  /**
   * Human-readable repository workflow type name shown in the scope section.
   */
  workflowTypeName: string;
  /**
   * Project-relative path to the produced specify-stage output.
   */
  specifyOutputRef: string;
  /**
   * Maintainer-approved discovery plan used for the run.
   */
  discoveryPlan: DiscoveryPlan;
  /**
   * Repository evidence records gathered for the run.
   */
  evidence: readonly RepositoryEvidence[];
  /**
   * Categorized drift findings for repository drift runs.
   */
  driftFindings: readonly DriftFinding[];
  /**
   * Direct, indirect, missing, or unknown validation mappings for discovered behavior.
   */
  testCoverageMappings: readonly TestCoverageMapping[];
  /**
   * Explicit test gap recommendations tied to behavior identifiers.
   */
  testGapRecommendations: readonly TestGapRecommendation[];
  /**
   * Assumptions recorded separately from confirmed evidence facts.
   */
  assumptions: readonly string[];
  /**
   * Maintainer-facing limitations for the completed run.
   */
  limitations: string;
  /**
   * Recommended downstream workflow steps after specify.
   */
  nextSteps: readonly string[];
  /**
   * Optional follow-up scoped run suggestion when discovery deferred product areas.
   */
  nextSuggestedScopedRun?: NextSuggestedScopedRun;
}

/**
 * Result returned when reading a repository workflow report artifact.
 */
export interface RepositoryWorkflowReportReadResult {
  /**
   * Zero-padded numeric task spec id for the report artifact.
   */
  taskSpecId: string;
  /**
   * Kebab-case slug paired with the task spec id.
   */
  slug: string;
  /**
   * Project-relative path to the report artifact.
   */
  reportPath: string;
  /**
   * Project-relative path to the linked specify output when present in the report.
   */
  specifyOutputRef: string | null;
  /**
   * Full markdown content of the report artifact.
   */
  markdown: string;
}

/**
 * Builds the project-relative path to a repository workflow report artifact.
 *
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Project-relative report path such as `specs/001-feature/repository-workflow-report.md`.
 */
export function repositoryWorkflowReportRelativePath(taskSpecId: string, slug: string): string {
  return `${taskSpecRelativeDir(taskSpecId, slug)}/${REPOSITORY_WORKFLOW_REPORT_FILENAME}`;
}

/**
 * Returns the maintainer-facing markdown heading for a report section.
 *
 * @param section - Required repository workflow report section id.
 * @returns Markdown heading text for the section.
 */
export function formatRepositoryWorkflowReportSectionHeading(
  section: RepositoryWorkflowReportSection,
): string {
  return REPOSITORY_WORKFLOW_REPORT_SECTION_HEADINGS[section];
}

/**
 * Builds a markdown section body with the standard report heading for a section.
 *
 * @param section - Required repository workflow report section id.
 * @param body - Markdown body content beneath the heading.
 * @returns Markdown fragment containing the section heading and body.
 */
export function renderRepositoryWorkflowReportSection(
  section: RepositoryWorkflowReportSection,
  body: string,
): string {
  const heading = formatRepositoryWorkflowReportSectionHeading(section);
  const trimmedBody = body.trim();

  if (trimmedBody.length === 0) {
    return `## ${heading}\n\n`;
  }

  return `## ${heading}\n\n${trimmedBody}\n`;
}

/**
 * Formats discovery plan bounds for repository workflow report scope sections.
 *
 * @param bounds - Bounded limits applied to the discovery pass.
 * @returns Comma-separated bounds summary or an empty string when no bounds are set.
 */
function formatDiscoveryPlanBoundsSummary(bounds: DiscoveryPlan['bounds']): string {
  const entries: string[] = [];

  if (bounds.maxDirectories != null) {
    entries.push(`maxDirectories: ${bounds.maxDirectories}`);
  }
  if (bounds.maxFiles != null) {
    entries.push(`maxFiles: ${bounds.maxFiles}`);
  }
  if (bounds.maxProductAreas != null) {
    entries.push(`maxProductAreas: ${bounds.maxProductAreas}`);
  }

  return entries.join(', ');
}

/**
 * Formats repository evidence records as markdown bullet lines.
 *
 * @param records - Evidence records to format.
 * @returns Markdown bullet list or an empty string when no records are provided.
 */
function formatEvidenceBulletList(records: readonly RepositoryEvidence[]): string {
  return records
    .map((record) => `- ${record.id}: ${record.behaviorSummary} (${record.sourceRef})`)
    .join('\n');
}

/**
 * Builds the scope section body for a repository workflow report.
 *
 * @param input - Report rendering input containing workflow and discovery plan details.
 * @returns Markdown body for the scope section.
 */
function renderScopeSectionBody(input: RepositoryWorkflowReportRenderInput): string {
  const scopeLines = [
    `- Workflow type: ${input.workflowTypeName}`,
    `- Included paths: ${input.discoveryPlan.includedPaths.join(', ')}`,
    `- Omitted paths: ${input.discoveryPlan.omittedPaths.join(', ') || 'none'}`,
  ];

  const boundsSummary = formatDiscoveryPlanBoundsSummary(input.discoveryPlan.bounds);
  if (boundsSummary.length > 0) {
    scopeLines.push(`- Bounds: ${boundsSummary}`);
  }

  if (input.discoveryPlan.livingSpecTargets.length > 0) {
    scopeLines.push(`- Living-spec targets: ${input.discoveryPlan.livingSpecTargets.join(', ')}`);
  }

  if (input.nextSuggestedScopedRun != null) {
    scopeLines.push(
      `- Next suggested scoped run: ${input.nextSuggestedScopedRun.includedPaths.join(', ')} (${input.nextSuggestedScopedRun.description})`,
    );
  }

  return scopeLines.join('\n');
}

/**
 * Builds the evidence summary section body separating confirmed facts from conflicts.
 *
 * @param evidence - Repository evidence records gathered for the run.
 * @returns Markdown body for the evidence summary section.
 */
function renderEvidenceSectionBody(evidence: readonly RepositoryEvidence[]): string {
  const confirmedFacts = evidence.filter((record) => record.evidenceKind !== 'conflict');
  const conflicts = evidence.filter((record) => record.evidenceKind === 'conflict');
  const sections: string[] = [];

  sections.push('### Confirmed Facts');
  sections.push(
    confirmedFacts.length > 0 ? formatEvidenceBulletList(confirmedFacts) : '- None recorded.',
  );

  sections.push('### Evidence Conflicts');
  sections.push(conflicts.length > 0 ? formatEvidenceBulletList(conflicts) : '- None recorded.');

  return sections.join('\n\n');
}

/**
 * Builds the drift findings section body for onboarding or drift runs.
 *
 * @param driftFindings - Categorized drift findings gathered for the run.
 * @returns Markdown body for the drift findings section.
 */
function renderDriftFindingsSectionBody(driftFindings: readonly DriftFinding[]): string {
  if (driftFindings.length === 0) {
    return 'No drift findings for onboarding runs.';
  }

  return driftFindings
    .map((finding) => {
      const authoritySuffix =
        finding.authorityChoice != null ? `; authority: ${finding.authorityChoice}` : '';
      return `- [${finding.category}] ${finding.summary} (${finding.livingSpecRef}${authoritySuffix})`;
    })
    .join('\n');
}

/**
 * Builds the test gaps section body tying gaps to behavior and validation targets.
 *
 * @param testCoverageMappings - Behavior-to-test mappings gathered for the run.
 * @param testGapRecommendations - Explicit test gap recommendations for the run.
 * @returns Markdown body for the test gaps section.
 */
function renderTestGapsSectionBody(
  testCoverageMappings: readonly TestCoverageMapping[],
  testGapRecommendations: readonly TestGapRecommendation[],
): string {
  const mappingLines = testCoverageMappings
    .filter((mapping) => mapping.coverageType === 'missing' || mapping.coverageType === 'unknown')
    .map(
      (mapping) =>
        `- ${mapping.behaviorId} (${mapping.coverageType}): ${
          mapping.recommendedValidationTarget ?? 'No validation target recorded.'
        }`,
    );

  const recommendationLines = testGapRecommendations.map(
    (gap) => `- ${gap.behaviorId}: ${gap.recommendedValidationTarget}`,
  );

  const body = [...mappingLines, ...recommendationLines].join('\n');
  return body.length > 0 ? body : 'No explicit test gaps identified.';
}

/**
 * Renders the full markdown body for a repository workflow report artifact.
 *
 * @param input - Report content inputs gathered during a completed workflow run.
 * @returns Markdown report body without the top-level title.
 */
export function renderRepositoryWorkflowReportMarkdown(
  input: RepositoryWorkflowReportRenderInput,
): string {
  return [
    renderRepositoryWorkflowReportSection('scope', renderScopeSectionBody(input)),
    renderRepositoryWorkflowReportSection(
      'specify-output',
      `- [spec.md](${input.specifyOutputRef})`,
    ),
    renderRepositoryWorkflowReportSection('evidence', renderEvidenceSectionBody(input.evidence)),
    renderRepositoryWorkflowReportSection(
      'drift-findings',
      renderDriftFindingsSectionBody(input.driftFindings),
    ),
    renderRepositoryWorkflowReportSection(
      'test-gaps',
      renderTestGapsSectionBody(input.testCoverageMappings, input.testGapRecommendations),
    ),
    renderRepositoryWorkflowReportSection(
      'assumptions',
      input.assumptions.map((assumption) => `- ${assumption}`).join('\n'),
    ),
    renderRepositoryWorkflowReportSection('limitations', input.limitations),
    renderRepositoryWorkflowReportSection(
      'next-steps',
      input.nextSteps.map((step) => `- ${step}`).join('\n'),
    ),
  ].join('\n');
}

/**
 * Writes a repository workflow report artifact for a completed workflow run.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param input - Report content inputs gathered during the workflow run.
 */
export async function writeRepositoryWorkflowReport(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  input: RepositoryWorkflowReportRenderInput,
): Promise<void> {
  const absoluteReportPath = taskSpecFilePath(
    projectRoot,
    taskSpecId,
    slug,
    REPOSITORY_WORKFLOW_REPORT_FILENAME,
  );
  const reportBody = renderRepositoryWorkflowReportMarkdown(input);

  await fse.ensureDir(path.dirname(absoluteReportPath));
  await fse.writeFile(absoluteReportPath, `# Repository Workflow Report\n\n${reportBody}`, 'utf8');
}

/**
 * Extracts a project-relative specify output reference from report markdown.
 *
 * @param markdown - Full report markdown content.
 * @returns Linked specify output path when present, otherwise null.
 */
export function parseSpecifyOutputRefFromReport(markdown: string): string | null {
  const linkMatch = /\[spec\.md\]\(([^)]+)\)/.exec(markdown);
  if (linkMatch?.[1] != null) {
    return linkMatch[1];
  }

  const bulletMatch = /^- (.+spec\.md)$/m.exec(markdown);
  return bulletMatch?.[1] ?? null;
}

/**
 * Extracts level-2 section headings from report markdown.
 *
 * @param markdown - Full report markdown content.
 * @returns Ordered section headings without the leading `## ` prefix.
 */
export function parseRepositoryWorkflowReportSectionHeadings(markdown: string): string[] {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? '').filter(Boolean);
}

/**
 * Extracts the workflow type name from a report scope section when present.
 *
 * @param markdown - Full report markdown content.
 * @returns Workflow type label from the scope section, or null when absent.
 */
export function parseWorkflowTypeNameFromReport(markdown: string): string | null {
  const match = /- Workflow type: (.+)$/m.exec(markdown);
  return match?.[1]?.trim() ?? null;
}

/**
 * Reads a repository workflow report artifact from disk.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Parsed report read result with markdown content and metadata.
 * @throws Error when the report artifact does not exist.
 */
export async function readRepositoryWorkflowReport(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<RepositoryWorkflowReportReadResult> {
  const reportPath = repositoryWorkflowReportRelativePath(taskSpecId, slug);
  const absoluteReportPath = taskSpecFilePath(
    projectRoot,
    taskSpecId,
    slug,
    REPOSITORY_WORKFLOW_REPORT_FILENAME,
  );

  if (!(await fse.pathExists(absoluteReportPath))) {
    throw new Error(`Repository workflow report not found: ${reportPath}`);
  }

  const markdown = await fse.readFile(absoluteReportPath, 'utf8');

  return {
    taskSpecId,
    slug,
    reportPath,
    specifyOutputRef: parseSpecifyOutputRefFromReport(markdown),
    markdown,
  };
}

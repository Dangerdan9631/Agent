import type { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import type { ValidationReportWriter } from '#application/validation/ports/ValidationReportWriter.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Writes deterministic validation JSON and a self-contained human-readable report page.
 */
export class NodeValidationReportWriter implements ValidationReportWriter {
  /**
   * Persists the canonical validation report beneath the configured artifact root.
   *
   * @param workspace - Loaded workspace with resolved artifact placement.
   * @param validation - Deterministic policy outcome to serialize.
   * @param enforcementEnabled - Indicates whether errors were command-enforced.
   * @returns A promise that resolves after report files are atomically written.
   */
  public async write(
    workspace: WorkspaceSnapshot,
    validation: ArchitectureValidationResult,
    enforcementEnabled: boolean
  ): Promise<void> {
    const artifactRootPath = workspace.paths.artifactRootPath;
    if (artifactRootPath === undefined) {
      throw new Error('Atlas cannot write a validation report before resolving an artifact root.');
    }
    const directoryPath = this.resolveContainedPath(artifactRootPath, 'validation');
    await mkdir(directoryPath, { recursive: true });
    const document = this.document(workspace, validation, enforcementEnabled);
    await this.writeAtomically(
      this.resolveContainedPath(directoryPath, 'report.json'),
      this.serialize(document)
    );
    await this.writeAtomically(
      this.resolveContainedPath(directoryPath, 'index.html'),
      this.page(document)
    );
  }

  /**
   * Creates portable versioned report data without machine-specific paths or timestamps.
   *
   * @param workspace - Loaded workspace used for coverage metadata.
   * @param validation - Deterministic policy outcome.
   * @param enforcementEnabled - Indicates whether errors were command-enforced.
   * @returns JSON-compatible validation report object.
   */
  private document(
    workspace: WorkspaceSnapshot,
    validation: ArchitectureValidationResult,
    enforcementEnabled: boolean
  ): ValidationReportDocument {
    const violations = [...validation.violations]
      .sort((left, right) => {
        const rule = left.ruleId.localeCompare(right.ruleId);
        if (rule !== 0) return rule;
        const source = left.sourcePath.localeCompare(right.sourcePath);
        return source === 0 ? left.targetPath.localeCompare(right.targetPath) : source;
      })
      .map((violation, index) => ({
        id: `v${String(index + 1).padStart(4, '0')}`,
        owner: violation.details.owner ?? this.owner(violation.ruleId),
        ruleId: violation.ruleId,
        severity: violation.severity,
        relationshipKind: violation.details.relationshipKind,
        remediation: violation.message,
        path: violation.relationshipPath,
        actual: violation.details.actual,
        maximum: violation.details.maximum,
        source: {
          moduleId: violation.details.sourceModuleId,
          elementId: violation.details.sourceElementId,
          path: violation.sourcePath
        },
        target: {
          moduleId: violation.details.targetModuleId,
          elementId: violation.details.targetElementId,
          path: violation.targetPath
        }
      }));
    const errors = violations.filter((violation) => violation.severity === 'error').length;
    const warnings = violations.length - errors;
    return {
      schemaVersion: 1,
      policyPassed: errors === 0,
      enforcementEnabled,
      complete: workspace.missingModelPaths.length === 0,
      loadedModuleIds: [...workspace.moduleConfigurationsById.keys()].sort((left, right) =>
        left.localeCompare(right)
      ),
      missingModelPaths: [...workspace.missingModelPaths].sort((left, right) =>
        left.localeCompare(right)
      ),
      counts: {
        errors,
        warnings,
        unassessable: validation.unassessableFactCount,
        total: violations.length
      },
      violations
    };
  }

  /**
   * Derives the module owner prefix applied by the validation orchestrator.
   *
   * @param ruleId - Globally stable reported rule identity.
   * @returns Root or module policy owner label.
   */
  private owner(ruleId: string): string {
    const delimiter = ruleId.indexOf(':');
    return delimiter < 0 ? 'root' : ruleId.slice(0, delimiter);
  }

  /**
   * Renders a small standalone report page that remains useful without viewer JavaScript.
   *
   * @param document - Report data to render.
   * @returns Complete HTML report page.
   */
  private page(document: ValidationReportDocument): string {
    const rows = document.violations
      .map(
        (violation) =>
          `<tr id="${violation.id}"><td>${this.escape(violation.severity)}</td><td>${this.escape(violation.ruleId)}</td><td>${this.escape(violation.source.path)}</td><td>${this.escape(violation.target.path)}</td><td>${this.escape(violation.remediation)}</td></tr>`
      )
      .join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Atlas Validation Report</title><style>body{font-family:system-ui;margin:2rem;color:#172033}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd3df;padding:.55rem;text-align:left}.error{color:#b42318}.warning{color:#a15c00}</style></head><body><h1>Validation Report</h1><p>${document.counts.errors} error(s), ${document.counts.warnings} warning(s), ${document.counts.unassessable} unassessable fact(s).</p><p>${document.complete ? 'Complete model coverage.' : `Partial model coverage: ${document.missingModelPaths.map((path) => this.escape(path)).join(', ')}`}</p><table><thead><tr><th>Severity</th><th>Rule</th><th>Source</th><th>Target</th><th>Remediation</th></tr></thead><tbody>${rows}</tbody></table></body></html>\n`;
  }

  /**
   * Escapes report values used in HTML text and attribute contexts.
   *
   * @param value - Untrusted text value.
   * @returns HTML-safe value.
   */
  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Resolves one artifact child path and rejects traversal outside its parent.
   *
   * @param rootPath - Absolute root or known contained parent directory.
   * @param childPath - Relative artifact child path.
   * @returns Contained resolved child path.
   */
  private resolveContainedPath(rootPath: string, childPath: string): string {
    const resolvedPath = resolve(rootPath, childPath);
    const relativePath = relative(rootPath, resolvedPath);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error(`Atlas artifact path '${childPath}' escapes configured root '${rootPath}'.`);
    }
    return resolvedPath;
  }

  /**
   * Serializes report data with sorted object keys and a trailing newline.
   *
   * @param value - JSON-compatible report data.
   * @returns Canonical JSON text.
   */
  private serialize(value: unknown): string {
    return `${JSON.stringify(this.sort(value), undefined, 2)}\n`;
  }

  /**
   * Sorts object keys recursively while retaining deliberate array ordering.
   *
   * @param value - JSON-compatible value to normalize.
   * @returns Canonically ordered value.
   */
  private sort(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => this.sort(entry));
    if (typeof value !== 'object' || value === null) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, this.sort(entry)])
    );
  }

  /**
   * Replaces one report file through a same-directory temporary file.
   *
   * @param path - Absolute contained report file path.
   * @param contents - Complete serialized file contents.
   * @returns A promise that resolves after atomic replacement completes.
   */
  private async writeAtomically(path: string, contents: string): Promise<void> {
    const temporaryPath = `${path}.tmp-${process.pid}`;
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, path);
  }
}

/**
 * Describes the version-one persisted validation report document.
 */
interface ValidationReportDocument {
  /** Persisted report schema version. */
  readonly schemaVersion: 1;
  /** Whether no error-severity violation was found. */
  readonly policyPassed: boolean;
  /** Whether this command treats error violations as a failure. */
  readonly enforcementEnabled: boolean;
  /** Whether every configured model was loaded. */
  readonly complete: boolean;
  /** Loaded module IDs in stable lexical order. */
  readonly loadedModuleIds: readonly string[];
  /** Missing configured model paths in stable lexical order. */
  readonly missingModelPaths: readonly string[];
  /** Violation and coverage counts. */
  readonly counts: {
    readonly errors: number;
    readonly warnings: number;
    readonly unassessable: number;
    readonly total: number;
  };
  /** Stable violation entries. */
  readonly violations: readonly ValidationReportViolation[];
}

/**
 * Describes one portable violation entry in the persisted validation report.
 */
interface ValidationReportViolation {
  /** Stable report-local violation identity. */
  readonly id: string;
  /** Declared error or warning severity. */
  readonly severity: string;
  /** Reported policy rule identity. */
  readonly ruleId: string;
  /** Portable source endpoint. */
  readonly source: { readonly path: string };
  /** Portable target endpoint. */
  readonly target: { readonly path: string };
  /** Human-readable remediation text. */
  readonly remediation: string;
}

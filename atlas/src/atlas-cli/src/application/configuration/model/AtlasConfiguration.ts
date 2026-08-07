/**
 * Describes the complete version-one Atlas policy configuration.
 */
export interface AtlasConfiguration {
  /**
   * Identifies the supported configuration document version. Version one is the only accepted value.
   */
  readonly schemaVersion: 1;

  /**
   * Defines package discovery and explicit package inclusion policy.
   */
  readonly discovery: AtlasDiscoveryConfiguration;

  /**
   * Defines the directory that contains generated Atlas artifacts.
   */
  readonly artifacts?: AtlasArtifactConfiguration;

  /**
   * Defines default deterministic layout settings for generated diagrams.
   */
  readonly layout?: AtlasLayoutConfiguration;

  /**
   * Defines generated diagram scopes and graph-shaping policy separate from architecture rules.
   */
  readonly diagrams?: AtlasDiagramConfiguration;

  /**
   * Declares architecture policies that Atlas evaluates during validation and generation.
   */
  readonly rules?: readonly AtlasArchitectureRule[];

  /**
   * Defines optional named source layers used by dependency-direction selectors.
   */
  readonly layers?: readonly AtlasLayerDefinition[];
}

/**
 * Configures workspace package discovery and classification.
 */
export interface AtlasDiscoveryConfiguration {
  /**
   * Matches package directories relative to the workspace root. An omitted value discovers the workspace root package.
   */
  readonly packageGlobs?: readonly string[];

  /**
   * Excludes package directories relative to the workspace root before policy matching.
   */
  readonly excludePackageGlobs?: readonly string[];

  /**
   * Defines source-root paths used when a package policy does not provide its own roots.
   */
  readonly defaultSourceRoots?: readonly string[];

  /**
   * Provides one explicit policy for every discovered package that Atlas includes.
   */
  readonly packages: readonly AtlasPackagePolicy[];
}

/**
 * Classifies one matching package and supplies its source-analysis settings.
 */
export interface AtlasPackagePolicy {
  /**
   * Selects package manifest names and/or workspace-relative directory paths.
   */
  readonly match: AtlasPackageMatch;

  /**
   * Determines whether the package appears in runtime architecture diagrams or only supports analysis.
   */
  readonly classification: AtlasPackageClassification;

  /**
   * Adds user-defined grouping labels used by later dependency-direction rules.
   */
  readonly classes?: readonly string[];

  /**
   * Overrides default source roots with paths relative to the matched package root.
   */
  readonly sourceRoots?: readonly string[];

  /**
   * Identifies an optional TypeScript configuration file relative to the matched package root.
   */
  readonly tsconfig?: string;
}

/**
 * Matches a package by its manifest name, relative directory path, or both.
 */
export interface AtlasPackageMatch {
  /**
   * Matches the package manifest name using a slash-normalized glob pattern.
   */
  readonly name?: string;

  /**
   * Matches the package directory relative to the workspace root using a slash-normalized glob pattern.
   */
  readonly path?: string;
}

/**
 * Identifies whether a package belongs to runtime architecture or supports development work.
 */
export type AtlasPackageClassification = 'runtime' | 'support';

/**
 * Configures where Atlas writes generated reports and diagrams.
 */
export interface AtlasArtifactConfiguration {
  /**
   * Names a non-empty path relative to the workspace root or an absolute artifact directory.
   */
  readonly root?: string;
}

/**
 * Configures deterministic default layout behavior.
 */
export interface AtlasLayoutConfiguration {
  /**
   * Arranges sibling items across columns or down rows when Atlas computes a layout.
   */
  readonly orientation?: AtlasLayoutOrientation;

  /**
   * Limits the number of sibling items in each generated row. Must be a positive integer.
   */
  readonly rows?: number;

  /**
   * Defines the minimum horizontal distance between rendered item bounds. Must be non-negative.
   */
  readonly horizontalGap?: number;

  /**
   * Defines the minimum vertical distance between rendered item bounds. Must be non-negative.
   */
  readonly verticalGap?: number;
}

/**
 * Identifies the primary axis used by the deterministic layout algorithm.
 */
export type AtlasLayoutOrientation = 'horizontal' | 'vertical';

/**
 * Configures generated diagram inclusion, external rendering, and opt-in folder scopes.
 */
export interface AtlasDiagramConfiguration {
  /**
   * Defines presentation-only groups that collapse matching canonical artifact module IDs.
   */
  readonly moduleGroups?: readonly AtlasModuleGroupConfiguration[];

  /**
   * Excludes local declaration nodes whose workspace-relative source paths match any slash-normalized glob.
   */
  readonly excludeSourceGlobs?: readonly string[];

  /**
   * Excludes external dependency nodes whose stable external labels match any glob.
   */
  readonly excludeExternalDependencies?: readonly string[];

  /**
   * Collapses visible external dependency nodes to one package-level node per external label.
   */
  readonly collapseExternalDependencies?: boolean;

  /**
   * Collapses matching external dependency labels when global external collapsing is disabled.
   */
  readonly collapseExternalDependencyGlobs?: readonly string[];

  /**
   * Splits landscape external dependency nodes by importing workspace package when enabled.
   */
  readonly splitExternalDependenciesByImporter?: boolean;

  /**
   * Selectively splits matching landscape external dependencies by their configured importing packages.
   */
  readonly externalDependencyImporterSplits?: readonly AtlasExternalDependencyImporterSplit[];

  /**
   * Defines package-specific source-node exclusions inherited by package and folder diagrams.
   */
  readonly packages?: readonly AtlasPackageDiagramConfiguration[];

  /**
   * Declares opt-in folder diagrams with inherited and overridden graph-shaping policy.
   */
  readonly folders?: readonly AtlasFolderDiagramConfiguration[];
}

/**
 * Defines one presentation-only grouping of independently versioned or targeted artifact modules.
 */
export interface AtlasModuleGroupConfiguration {
  /**
   * Stable group identity used for diagram and layout scope IDs.
   */
  readonly id: string;

  /**
   * Human-readable diagram title for this presentation group.
   */
  readonly title: string;

  /**
   * Glob patterns matched against opaque artifact module IDs.
   */
  readonly moduleIdPatterns: readonly string[];
}

/**
 * Defines one package-local folder diagram scope.
 */
export interface AtlasFolderDiagramConfiguration {
  /**
   * Identifies the explicitly discovered package that owns the folder.
   */
  readonly packageName: string;

  /**
   * Names a slash-normalized folder path relative to the owning package root.
   */
  readonly path: string;

  /**
   * Optionally overrides the generated human-readable folder diagram title.
   */
  readonly title?: string;

  /**
   * Adds source-node exclusions to inherited diagram exclusions.
   */
  readonly excludeSourceGlobs?: readonly string[];

  /**
   * Adds external dependency exclusions to inherited diagram exclusions.
   */
  readonly excludeExternalDependencies?: readonly string[];

  /**
   * Optionally overrides inherited external dependency collapsing.
   */
  readonly collapseExternalDependencies?: boolean;

  /**
   * Optionally overrides inherited per-importer external dependency splitting.
   */
  readonly splitExternalDependenciesByImporter?: boolean;

  /**
   * Adds selective external dependency importer splits to inherited landscape policy.
   */
  readonly externalDependencyImporterSplits?: readonly AtlasExternalDependencyImporterSplit[];
}

/**
 * Splits one external dependency into separate landscape nodes for selected importing packages.
 */
export interface AtlasExternalDependencyImporterSplit {
  /**
   * Matches one external dependency label using a slash-normalized glob pattern.
   */
  readonly dependency: string;

  /**
   * Names the importing workspace packages that receive separate external dependency nodes.
   */
  readonly packageNames: readonly string[];
}

/**
 * Defines source-node graph-shaping policy for one explicitly discovered package.
 */
export interface AtlasPackageDiagramConfiguration {
  /**
   * Identifies the explicitly discovered package to which this policy applies.
   */
  readonly packageName: string;

  /**
   * Adds source-node exclusions to global diagram exclusions for this package's declarations.
   */
  readonly excludeSourceGlobs?: readonly string[];
}

/**
 * Describes one architecture policy rule supported by the initial validation engine.
 */
export type AtlasArchitectureRule =
  | AtlasCircularDependencyRule
  | AtlasRuntimeToSupportRule
  | AtlasDependencyDirectionRule
  | AtlasForbiddenImportRule
  | AtlasForbiddenExternalRule;

/**
 * Rejects directed import cycles reported by the dependency analysis adapter.
 */
export interface AtlasCircularDependencyRule {
  /**
   * Uniquely identifies this policy rule within one configuration document.
   */
  readonly id: string;

  /**
   * Identifies circular-dependency policy behavior.
   */
  readonly type: 'no-circular';

  /**
   * Determines whether a violation fails the command or is reported as a warning.
   */
  readonly severity: AtlasRuleSeverity;
}

/**
 * Rejects direct dependencies from runtime packages to support packages.
 */
export interface AtlasRuntimeToSupportRule {
  /**
   * Uniquely identifies this policy rule within one configuration document.
   */
  readonly id: string;

  /**
   * Identifies runtime-to-support dependency policy behavior.
   */
  readonly type: 'no-runtime-to-support';

  /**
   * Determines whether a violation fails the command or is reported as a warning.
   */
  readonly severity: AtlasRuleSeverity;
}

/**
 * Restricts dependency directions between named packages, package classes, or source layers.
 */
export interface AtlasDependencyDirectionRule {
  /**
   * Uniquely identifies this policy rule within one configuration document.
   */
  readonly id: string;

  /**
   * Identifies directional dependency policy behavior.
   */
  readonly type: 'dependency-direction';

  /**
   * Determines whether a violation fails the command or is reported as a warning.
   */
  readonly severity: AtlasRuleSeverity;

  /**
   * Determines whether matched targets are exclusively allowed or explicitly forbidden.
   */
  readonly mode: AtlasDependencyDirectionMode;

  /**
   * Selects importing packages or source layers to which this direction rule applies.
   */
  readonly from: AtlasRuleSelector;

  /**
   * Selects dependency targets allowed or forbidden by this rule.
   */
  readonly to: AtlasRuleSelector;
}

/**
 * Rejects import specifiers matching configured patterns from selected sources.
 */
export interface AtlasForbiddenImportRule {
  /**
   * Uniquely identifies this policy rule within one configuration document.
   */
  readonly id: string;

  /**
   * Identifies import-specifier prohibition behavior.
   */
  readonly type: 'forbidden-import';

  /**
   * Determines whether a violation fails the command or is reported as a warning.
   */
  readonly severity: AtlasRuleSeverity;

  /**
   * Optionally limits the rule to selected importing packages or source layers.
   */
  readonly from?: AtlasRuleSelector;

  /**
   * Lists slash-normalized glob patterns that must not appear as import specifiers.
   */
  readonly patterns: readonly string[];
}

/**
 * Rejects external package imports matching configured package patterns from selected sources.
 */
export interface AtlasForbiddenExternalRule {
  /**
   * Uniquely identifies this policy rule within one configuration document.
   */
  readonly id: string;

  /**
   * Identifies external package prohibition behavior.
   */
  readonly type: 'forbidden-external';

  /**
   * Determines whether a violation fails the command or is reported as a warning.
   */
  readonly severity: AtlasRuleSeverity;

  /**
   * Optionally limits the rule to selected importing packages or source layers.
   */
  readonly from?: AtlasRuleSelector;

  /**
   * Lists package-root glob patterns that must not be imported as external dependencies.
   */
  readonly packages: readonly string[];
}

/**
 * Selects packages and source files by exact package names, package classes, or named layers.
 */
export interface AtlasRuleSelector {
  /**
   * Matches opaque artifact module IDs. TypeScript package names remain compatible module-ID aliases.
   */
  readonly moduleIds?: readonly string[];

  /**
   * Matches one or more exact discovered package manifest names.
   */
  readonly packageNames?: readonly string[];

  /**
   * Matches packages carrying one or more configured package class labels.
   */
  readonly packageClasses?: readonly string[];

  /**
   * Matches source paths belonging to one or more named source layers.
   */
  readonly layers?: readonly string[];
}

/**
 * Defines a named source-layer selector for direction rules.
 */
export interface AtlasLayerDefinition {
  /**
   * Uniquely identifies the layer for rule selectors.
   */
  readonly name: string;

  /**
   * Lists slash-normalized workspace-relative source path glob patterns in this layer.
   */
  readonly sourceGlobs: readonly string[];

  /**
   * Optionally limits the layer to exact discovered package manifest names.
   */
  readonly packageNames?: readonly string[];
}

/**
 * Determines whether a dependency target is exclusively allowed or explicitly forbidden.
 */
export type AtlasDependencyDirectionMode = 'allow-only' | 'forbid';

/**
 * Determines the command outcome for a reported architecture policy violation.
 */
export type AtlasRuleSeverity = 'error' | 'warning';

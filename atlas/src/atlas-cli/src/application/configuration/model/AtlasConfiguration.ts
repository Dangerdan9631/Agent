/**
 * Describes the fully composed version-two Atlas project configuration.
 */
export interface AtlasConfiguration {
  /**
   * Identifies the supported configuration schema version.
   */
  readonly schemaVersion: 2;

  /**
   * Identifies this document as the single project root.
   */
  readonly documentType: 'root';

  /**
   * Lists normalized project-relative base fragments in application order.
   */
  readonly extends?: readonly string[];

  /**
   * Defines project identity, artifact placement, defaults, and project diagrams.
   */
  readonly project: AtlasProjectConfiguration;

  /**
   * Lists complete module configurations in their processing order.
   */
  readonly modules: readonly AtlasModuleConfiguration[];

  /**
   * Defines rules evaluated between successfully loaded modules.
   */
  readonly validation?: AtlasRootValidationConfiguration;
}

/**
 * Defines project-owned identity, output, and diagram policy.
 */
export interface AtlasProjectConfiguration {
  /**
   * Provides the non-empty human-readable project name.
   */
  readonly name: string;

  /**
   * Defines the project-level generated artifact directory.
   */
  readonly artifacts: AtlasArtifactConfiguration;

  /**
   * Defines composed external-dependency presentation defaults.
   */
  readonly diagramDefaults?: AtlasExternalDiagramDefaults;

  /**
   * Declares explicit project landscape diagrams.
   */
  readonly diagrams?: readonly AtlasProjectDiagram[];
}

/**
 * Configures where Atlas writes project-level generated artifacts.
 */
export interface AtlasArtifactConfiguration {
  /**
   * Names a normalized path contained by the project root.
   */
  readonly root: string;
}

/**
 * Describes one complete configured generated module model.
 */
export interface AtlasModuleConfiguration {
  /**
   * Names a normalized path relative to the artifact root's `model` directory.
   */
  readonly model: string;

  /**
   * Provides unique project-policy labels for the loaded module.
   */
  readonly tags?: readonly string[];

  /**
   * Declares explicit diagrams owned by this module.
   */
  readonly diagrams?: readonly AtlasModuleDiagram[];

  /**
   * Defines rules evaluated from the owning loaded module.
   */
  readonly validation?: AtlasModuleValidationConfiguration;
}

/**
 * Defines external-dependency defaults that may be composed from base fragments.
 */
export interface AtlasExternalDiagramDefaults {
  /**
   * Defines the external dependency behavior inherited by diagrams.
   */
  readonly externalDependencies: AtlasExternalDependencyDefaults;
}

/**
 * Defines the inheritable subset of external dependency presentation behavior.
 */
export interface AtlasExternalDependencyDefaults {
  /**
   * Excludes external IDs matching any complete ID pattern.
   */
  readonly excludeIds?: readonly string[];

  /**
   * Defines how equal external identities are collapsed.
   */
  readonly collapse?: AtlasExternalCollapseConfiguration;
}

/**
 * Configures external target collapsing for a diagram or inherited defaults.
 */
export interface AtlasExternalCollapseConfiguration {
  /**
   * Selects all, matching, or no external identities for collapsing.
   */
  readonly mode: AtlasExternalCollapseMode;

  /**
   * Lists complete ID patterns used only by matching mode.
   */
  readonly ids?: readonly string[];
}

/**
 * Identifies supported external target collapsing behavior.
 */
export type AtlasExternalCollapseMode = 'all' | 'matching' | 'none';

/**
 * Defines fields shared by project and module diagrams.
 */
export interface AtlasDiagramConfiguration {
  /**
   * Provides the stable diagram identity within its owning scope.
   */
  readonly id: string;

  /**
   * Provides the non-empty viewer title.
   */
  readonly title: string;

  /**
   * Determines whether composed external defaults are applied before local settings.
   */
  readonly inheritDefaults?: boolean;

  /**
   * Defines layout behavior local to this diagram.
   */
  readonly layout?: AtlasLayoutConfiguration;

  /**
   * Defines presentation filters local to this diagram.
   */
  readonly filters?: AtlasDiagramFilters;

  /**
   * Defines diagram-local external dependency presentation behavior.
   */
  readonly externalDependencies?: AtlasExternalDependencyOptions;
}

/**
 * Describes one explicitly configured project landscape diagram.
 */
export interface AtlasProjectDiagram extends AtlasDiagramConfiguration {
  /**
   * Defines non-overlapping presentation groups for loaded modules.
   */
  readonly groups?: readonly AtlasProjectDiagramGroup[];
}

/**
 * Describes one explicitly configured module diagram.
 */
export interface AtlasModuleDiagram extends AtlasDiagramConfiguration {
  /**
   * Selects the entire owning module or one module-relative source path.
   */
  readonly scope: AtlasModuleDiagramScope;
}

/**
 * Selects the source facts projected by one module diagram.
 */
export type AtlasModuleDiagramScope = AtlasWholeModuleScope | AtlasSourcePathScope;

/**
 * Selects every included element in the owning module.
 */
export interface AtlasWholeModuleScope {
  /**
   * Identifies whole-module scope behavior.
   */
  readonly type: 'module';
}

/**
 * Selects elements at or below one module-relative source path.
 */
export interface AtlasSourcePathScope {
  /**
   * Identifies source-path scope behavior.
   */
  readonly type: 'path';

  /**
   * Names a normalized module-relative path without glob syntax.
   */
  readonly path: string;
}

/**
 * Defines one named group in a project diagram.
 */
export interface AtlasProjectDiagramGroup {
  /**
   * Provides the stable group identity within its diagram.
   */
  readonly id: string;

  /**
   * Provides the non-empty presentation title.
   */
  readonly title: string;

  /**
   * Selects loaded modules assigned to this group.
   */
  readonly selector: AtlasModuleSelector;
}

/**
 * Configures deterministic layout behavior for one diagram.
 */
export interface AtlasLayoutConfiguration {
  /**
   * Selects the primary sibling placement axis.
   */
  readonly orientation?: AtlasLayoutOrientation;

  /**
   * Limits generated sibling items per row and must be a positive integer.
   */
  readonly rows?: number;

  /**
   * Defines a finite non-negative horizontal gap.
   */
  readonly horizontalGap?: number;

  /**
   * Defines a finite non-negative vertical gap.
   */
  readonly verticalGap?: number;
}

/**
 * Identifies the primary axis used by deterministic layout.
 */
export type AtlasLayoutOrientation = 'horizontal' | 'vertical';

/**
 * Defines presentation-only element and relationship filters for one diagram.
 */
export interface AtlasDiagramFilters {
  /**
   * Includes only elements having one of the listed normalized kinds.
   */
  readonly elementKinds?: readonly AtlasElementKind[];

  /**
   * Includes only elements having one of the listed normalized visibilities.
   */
  readonly visibilities?: readonly AtlasVisibility[];

  /**
   * Includes elements carrying at least one listed trait.
   */
  readonly traits?: readonly string[];

  /**
   * Includes only relationships having one of the listed normalized kinds.
   */
  readonly relationshipKinds?: readonly AtlasRelationshipKind[];

  /**
   * Excludes elements whose module-relative path matches a listed path pattern.
   */
  readonly excludeSourcePaths?: readonly string[];
}

/**
 * Defines diagram-local external dependency behavior.
 */
export interface AtlasExternalDependencyOptions extends AtlasExternalDependencyDefaults {
  /**
   * Separates collapsed external targets by importing module in project diagrams.
   */
  readonly splitByModule?: boolean;
}

/**
 * Selects loaded modules by derived identity and configured tags.
 */
export interface AtlasModuleSelector {
  /**
   * Matches derived module IDs using complete ID patterns.
   */
  readonly moduleIds?: readonly string[];

  /**
   * Matches modules carrying at least one listed project-policy tag.
   */
  readonly moduleTags?: readonly string[];
}

/**
 * Selects elements inside one loaded module.
 */
export interface AtlasElementSelector {
  /**
   * Matches elements having one of the listed kinds.
   */
  readonly elementKinds?: readonly AtlasElementKind[];

  /**
   * Matches elements having one of the listed normalized visibilities.
   */
  readonly visibilities?: readonly AtlasVisibility[];

  /**
   * Matches elements carrying at least one listed trait.
   */
  readonly traits?: readonly string[];

  /**
   * Matches module-relative element paths using path patterns.
   */
  readonly sourcePaths?: readonly string[];
}

/**
 * Groups rules evaluated only between distinct successfully loaded modules.
 */
export interface AtlasRootValidationConfiguration {
  /**
   * Lists unique project rule definitions.
   */
  readonly rules: readonly AtlasRootRule[];
}

/**
 * Groups rules evaluated from one successfully loaded module.
 */
export interface AtlasModuleValidationConfiguration {
  /**
   * Lists unique module-owned rule definitions.
   */
  readonly rules: readonly AtlasModuleRule[];
}

/**
 * Describes a rule supported at the project boundary.
 */
export type AtlasRootRule =
  | AtlasRootCircularRule
  | AtlasRootDependencyDirectionRule
  | AtlasPublicApiOnlyRule
  | AtlasRootDependencyBudgetRule
  | AtlasRootRequiredDependencyRule
  | AtlasRootNoOrphansRule;

/**
 * Describes a rule supported at the module boundary.
 */
export type AtlasModuleRule =
  | AtlasModuleCircularRule
  | AtlasModuleDependencyDirectionRule
  | AtlasForbidRule
  | AtlasModuleDependencyBudgetRule
  | AtlasModuleRequiredDependencyRule
  | AtlasModuleNoOrphansRule;

/**
 * Defines fields shared by every version-two validation rule.
 */
export interface AtlasRuleConfiguration {
  /**
   * Provides the stable rule identity within its owning validation block.
   */
  readonly id: string;

  /**
   * Determines whether a violation fails validation or is reported as a warning.
   */
  readonly severity: AtlasRuleSeverity;

  /**
   * Selects the relationship facts evaluated by this rule.
   */
  readonly relationships: readonly AtlasRelationshipKind[];
}

/**
 * Rejects inter-module cycles among optionally selected modules.
 */
export interface AtlasRootCircularRule extends AtlasRuleConfiguration {
  /**
   * Identifies cycle prohibition behavior.
   */
  readonly type: 'no-circular';

  /**
   * Optionally limits cycle evaluation to matching modules.
   */
  readonly within?: AtlasModuleSelector;
}

/**
 * Restricts dependency direction between selected modules.
 */
export interface AtlasRootDependencyDirectionRule extends AtlasRuleConfiguration {
  /**
   * Identifies directional dependency behavior.
   */
  readonly type: 'dependency-direction';

  /**
   * Selects allow-only or forbidden target behavior.
   */
  readonly mode: AtlasDependencyDirectionMode;

  /**
   * Selects source modules.
   */
  readonly from: AtlasModuleSelector;

  /**
   * Selects target modules.
   */
  readonly to: AtlasModuleSelector;
}

/**
 * Rejects element cycles inside one owning module.
 */
export interface AtlasModuleCircularRule extends AtlasRuleConfiguration {
  /**
   * Identifies cycle prohibition behavior.
   */
  readonly type: 'no-circular';

  /**
   * Optionally limits cycle evaluation to matching elements.
   */
  readonly within?: AtlasElementSelector;
}

/**
 * Restricts dependency direction between selected elements in one module.
 */
export interface AtlasModuleDependencyDirectionRule extends AtlasRuleConfiguration {
  /**
   * Identifies directional dependency behavior.
   */
  readonly type: 'dependency-direction';

  /**
   * Selects allow-only or forbidden target behavior.
   */
  readonly mode: AtlasDependencyDirectionMode;

  /**
   * Selects source elements in the owning module.
   */
  readonly from: AtlasElementSelector;

  /**
   * Selects target elements in the owning module.
   */
  readonly to: AtlasElementSelector;
}

/**
 * Rejects selected local, module, or external dependency targets from one module.
 */
export interface AtlasForbidRule extends AtlasRuleConfiguration {
  /**
   * Identifies general target prohibition behavior.
   */
  readonly type: 'forbid';

  /**
   * Optionally limits source elements in the owning module.
   */
  readonly from?: AtlasElementSelector;

  /**
   * Selects exactly one target selector form.
   */
  readonly to: AtlasForbidTargetSelector;
}

/**
 * Rejects cross-module dependencies that resolve to a non-public target element.
 */
export interface AtlasPublicApiOnlyRule extends AtlasRuleConfiguration {
  /** Identifies public API boundary behavior. */
  readonly type: 'public-api-only';

  /** Optionally narrows source modules. */
  readonly from?: AtlasModuleSelector;

  /** Optionally narrows target modules. */
  readonly to?: AtlasModuleSelector;
}

/**
 * Defines the direction used by a direct dependency count or orphan check.
 */
export type AtlasDependencyDirection = 'incoming' | 'outgoing' | 'either';

/**
 * Defines whether a budget counts unique endpoints or individual relationships.
 */
export type AtlasDependencyBudgetCount = 'endpoints' | 'relationships';

/**
 * Defines fields shared by root and module direct dependency budgets.
 */
export interface AtlasDependencyBudgetRule extends AtlasRuleConfiguration {
  /** Selects direct subjects to measure. */
  readonly within: AtlasModuleSelector | AtlasElementSelector;

  /** Selects dependency direction relative to each subject. */
  readonly direction: AtlasDependencyDirection;

  /** Selects the direct-fact counting unit. */
  readonly count: AtlasDependencyBudgetCount;

  /** Defines the inclusive non-negative budget. */
  readonly maximum: number;
}

/**
 * Limits direct inter-module dependencies for selected modules.
 */
export interface AtlasRootDependencyBudgetRule extends AtlasDependencyBudgetRule {
  /** Identifies dependency budget behavior. */
  readonly type: 'dependency-budget';

  /** Selects loaded module subjects. */
  readonly within: AtlasModuleSelector;
}

/**
 * Limits direct local element dependencies for selected module elements.
 */
export interface AtlasModuleDependencyBudgetRule extends AtlasDependencyBudgetRule {
  /** Identifies dependency budget behavior. */
  readonly type: 'dependency-budget';

  /** Selects module-local element subjects. */
  readonly within: AtlasElementSelector;
}

/**
 * Defines fields shared by root and module required dependency rules.
 */
export interface AtlasRequiredDependencyRule extends AtlasRuleConfiguration {
  /** Selects source boundaries which must reach at least one target. */
  readonly from: AtlasModuleSelector | AtlasElementSelector;

  /** Selects required target boundaries. */
  readonly to: AtlasModuleSelector | AtlasElementSelector;

  /** Selects direct or positive-length transitive reachability. */
  readonly path: 'direct' | 'transitive';
}

/**
 * Requires selected loaded modules to reach selected loaded modules.
 */
export interface AtlasRootRequiredDependencyRule extends AtlasRequiredDependencyRule {
  /** Identifies required dependency behavior. */
  readonly type: 'required-dependency';

  /** Selects source modules. */
  readonly from: AtlasModuleSelector;

  /** Selects target modules. */
  readonly to: AtlasModuleSelector;
}

/**
 * Requires selected module-local elements to reach selected local elements.
 */
export interface AtlasModuleRequiredDependencyRule extends AtlasRequiredDependencyRule {
  /** Identifies required dependency behavior. */
  readonly type: 'required-dependency';

  /** Selects source elements. */
  readonly from: AtlasElementSelector;

  /** Selects target elements. */
  readonly to: AtlasElementSelector;
}

/**
 * Defines fields shared by root and module orphan rules.
 */
export interface AtlasNoOrphansRule extends AtlasRuleConfiguration {
  /** Selects subjects checked for direct relationships. */
  readonly within: AtlasModuleSelector | AtlasElementSelector;

  /** Selects relationship direction relative to each subject. */
  readonly direction: AtlasDependencyDirection;
}

/**
 * Rejects selected loaded modules without a direct relationship in the requested direction.
 */
export interface AtlasRootNoOrphansRule extends AtlasNoOrphansRule {
  /** Identifies orphan detection behavior. */
  readonly type: 'no-orphans';

  /** Selects loaded module subjects. */
  readonly within: AtlasModuleSelector;
}

/**
 * Rejects selected local elements without a direct relationship in the requested direction.
 */
export interface AtlasModuleNoOrphansRule extends AtlasNoOrphansRule {
  /** Identifies orphan detection behavior. */
  readonly type: 'no-orphans';

  /** Selects module-local element subjects. */
  readonly within: AtlasElementSelector;
}

/**
 * Selects one supported target family for a module forbid rule.
 */
export type AtlasForbidTargetSelector =
  AtlasModuleSelector | AtlasElementSelector | AtlasExternalTargetSelector;

/**
 * Selects unresolved external relationship targets by complete ID pattern.
 */
export interface AtlasExternalTargetSelector {
  /**
   * Matches external IDs using complete ID patterns.
   */
  readonly externalIds: readonly string[];
}

/**
 * Determines whether selected targets are exclusively allowed or forbidden.
 */
export type AtlasDependencyDirectionMode = 'allow-only' | 'forbid';

/**
 * Determines command outcome for a validation violation.
 */
export type AtlasRuleSeverity = 'error' | 'warning';

/**
 * Identifies normalized source element categories accepted by module models and selectors.
 */
export type AtlasElementKind =
  | 'namespace'
  | 'source-unit'
  | 'class'
  | 'interface'
  | 'struct'
  | 'record'
  | 'enum'
  | 'annotation'
  | 'delegate'
  | 'type-alias'
  | 'function'
  | 'local-function'
  | 'constructor'
  | 'method'
  | 'property'
  | 'field'
  | 'constant'
  | 'event'
  | 'enum-member'
  | 'parameter'
  | 'local-variable'
  | 'type-parameter';

/**
 * Identifies normalized source visibility values.
 */
export type AtlasVisibility = 'public' | 'protected' | 'internal' | 'private' | 'local' | 'unknown';

/**
 * Identifies normalized semantic relationship categories.
 */
export type AtlasRelationshipKind =
  | 'imports'
  | 'exports'
  | 'references'
  | 'inherits'
  | 'implements'
  | 'calls'
  | 'instantiates'
  | 'reads'
  | 'writes'
  | 'overrides'
  | 'decorates';

/**
 * Identifies whether a compatibility workspace package represents runtime or support behavior.
 */
export type AtlasPackageClassification = 'runtime' | 'support';

/**
 * Describes obsolete source-discovery policy retained only by isolated compatibility adapters.
 */
export interface AtlasDiscoveryConfiguration {
  /** Lists workspace package directory patterns. */
  readonly packageGlobs?: readonly string[];
  /** Lists excluded workspace package directory patterns. */
  readonly excludePackageGlobs?: readonly string[];
  /** Lists default package-relative source roots. */
  readonly defaultSourceRoots?: readonly string[];
  /** Lists explicit package selection policies. */
  readonly packages: readonly AtlasPackagePolicy[];
}

/**
 * Describes one obsolete source package selection policy at the compatibility boundary.
 */
export interface AtlasPackagePolicy {
  /** Selects a package by name or relative path. */
  readonly match: AtlasPackageMatch;
  /** Classifies runtime or support behavior. */
  readonly classification: AtlasPackageClassification;
  /** Lists compatibility grouping labels. */
  readonly classes?: readonly string[];
  /** Lists package-relative source roots. */
  readonly sourceRoots?: readonly string[];
  /** Names a package-relative TypeScript project file. */
  readonly tsconfig?: string;
}

/**
 * Selects one obsolete source package by name or project-relative path pattern.
 */
export interface AtlasPackageMatch {
  /** Matches the package manifest name. */
  readonly name?: string;
  /** Matches the project-relative package path. */
  readonly path?: string;
}

/**
 * Describes legacy graph-shaping fields used only while existing artifact adapters are migrated.
 */
export interface AtlasLegacyDiagramConfiguration {
  /** Lists presentation groups. */
  readonly moduleGroups?: readonly AtlasModuleGroupConfiguration[];
  /** Lists source exclusions. */
  readonly excludeSourceGlobs?: readonly string[];
  /** Lists external exclusions. */
  readonly excludeExternalDependencies?: readonly string[];
  /** Controls global external collapsing. */
  readonly collapseExternalDependencies?: boolean;
  /** Lists selectively collapsed external IDs. */
  readonly collapseExternalDependencyGlobs?: readonly string[];
  /** Controls external splitting by importing module. */
  readonly splitExternalDependenciesByImporter?: boolean;
  /** Lists selective external splits. */
  readonly externalDependencyImporterSplits?: readonly AtlasExternalDependencyImporterSplit[];
  /** Lists module-specific source exclusions. */
  readonly packages?: readonly AtlasPackageDiagramConfiguration[];
  /** Lists module-local path diagrams. */
  readonly folders?: readonly AtlasFolderDiagramConfiguration[];
}

/**
 * Describes one legacy presentation group projected by the current artifact adapter.
 */
export interface AtlasModuleGroupConfiguration {
  /** Provides the stable group ID. */
  readonly id: string;
  /** Provides the presentation title. */
  readonly title: string;
  /** Lists matched module ID patterns. */
  readonly moduleIdPatterns: readonly string[];
}

/**
 * Describes one legacy module-local path diagram projected by the current artifact adapter.
 */
export interface AtlasFolderDiagramConfiguration {
  /** Names the owning loaded module. */
  readonly packageName: string;
  /** Names the module-relative path. */
  readonly path: string;
  /** Provides an optional title. */
  readonly title?: string;
  /** Lists source exclusions. */
  readonly excludeSourceGlobs?: readonly string[];
  /** Lists external exclusions. */
  readonly excludeExternalDependencies?: readonly string[];
  /** Controls external collapsing. */
  readonly collapseExternalDependencies?: boolean;
  /** Controls external splitting. */
  readonly splitExternalDependenciesByImporter?: boolean;
  /** Lists selective external splits. */
  readonly externalDependencyImporterSplits?: readonly AtlasExternalDependencyImporterSplit[];
}

/**
 * Describes one legacy selective external dependency split.
 */
export interface AtlasExternalDependencyImporterSplit {
  /** Matches one external identity. */
  readonly dependency: string;
  /** Lists importing module identities. */
  readonly packageNames: readonly string[];
}

/**
 * Describes one legacy module-specific source exclusion policy.
 */
export interface AtlasPackageDiagramConfiguration {
  /** Names the loaded module. */
  readonly packageName: string;
  /** Lists module-relative source exclusions. */
  readonly excludeSourceGlobs?: readonly string[];
}

/**
 * Selects legacy compatibility relationships by module and source classification.
 */
export interface AtlasRuleSelector {
  /** Lists exact or patterned module identities. */
  readonly moduleIds?: readonly string[];
  /** Lists exact legacy package names. */
  readonly packageNames?: readonly string[];
  /** Lists configured compatibility tags. */
  readonly packageClasses?: readonly string[];
  /** Lists legacy named layers. */
  readonly layers?: readonly string[];
}

/**
 * Describes one obsolete named source layer retained by validation compatibility adapters.
 */
export interface AtlasLayerDefinition {
  /** Provides the unique layer name. */
  readonly name: string;
  /** Lists source path patterns in the layer. */
  readonly sourceGlobs: readonly string[];
  /** Optionally limits the layer to named modules. */
  readonly packageNames?: readonly string[];
}

/**
 * Describes a compatibility validation rule consumed by the current evaluator ports.
 */
export type AtlasArchitectureRule =
  | AtlasRootRule
  | AtlasModuleRule
  | AtlasRuntimeToSupportRule
  | AtlasForbiddenImportRule
  | AtlasForbiddenExternalRule;

/**
 * Identifies either root- or module-level cycle behavior.
 */
export type AtlasCircularDependencyRule = AtlasRootCircularRule | AtlasModuleCircularRule;

/**
 * Identifies either root- or module-level dependency direction behavior.
 */
export type AtlasDependencyDirectionRule =
  AtlasRootDependencyDirectionRule | AtlasModuleDependencyDirectionRule;

/**
 * Describes obsolete runtime-to-support validation retained only for compatibility.
 */
export interface AtlasRuntimeToSupportRule {
  /** Provides the stable rule ID. */
  readonly id: string;
  /** Identifies compatibility behavior. */
  readonly type: 'no-runtime-to-support';
  /** Determines validation outcome. */
  readonly severity: AtlasRuleSeverity;
}

/**
 * Describes obsolete import-text validation retained only for compatibility.
 */
export interface AtlasForbiddenImportRule {
  /** Provides the stable rule ID. */
  readonly id: string;
  /** Identifies compatibility behavior. */
  readonly type: 'forbidden-import';
  /** Determines validation outcome. */
  readonly severity: AtlasRuleSeverity;
  /** Optionally selects source modules or layers. */
  readonly from?: AtlasRuleSelector;
  /** Lists forbidden import text patterns. */
  readonly patterns: readonly string[];
}

/**
 * Describes obsolete external-package validation retained only for compatibility.
 */
export interface AtlasForbiddenExternalRule {
  /** Provides the stable rule ID. */
  readonly id: string;
  /** Identifies compatibility behavior. */
  readonly type: 'forbidden-external';
  /** Determines validation outcome. */
  readonly severity: AtlasRuleSeverity;
  /** Optionally selects source modules or layers. */
  readonly from?: AtlasRuleSelector;
  /** Lists forbidden external ID patterns. */
  readonly packages: readonly string[];
}

/**
 * Describes a portable Atlas model generated for one npm package.
 */
export interface TypeScriptModuleModel {
  /** Independently versioned module-model schema identifier. */
  readonly schemaVersion: 1;
  /** Version of the TypeScript generator that produced the model. */
  readonly generatorVersion: string;
  /** Published npm package identity owned by the model. */
  readonly module: TypeScriptModuleIdentity;
  /** Presentation-only source language metadata. */
  readonly sourceLanguage: "typescript";
  /** Source units and declarations owned by the npm package. */
  readonly elements: readonly TypeScriptModuleElement[];
  /** Import relationships sourced by owned source units. */
  readonly relationships: readonly TypeScriptModuleRelationship[];
}

/**
 * Identifies the npm package represented by a portable module model.
 */
export interface TypeScriptModuleIdentity {
  /** Stable npm package name. */
  readonly id: string;
  /** Human-readable npm package name. */
  readonly displayName: string;
  /** Package manifest version, or 0.0.0 when omitted. */
  readonly version: string;
  /** Ecosystem-neutral published artifact category. */
  readonly category: "npm-package";
}

/**
 * Represents a TypeScript source unit or supported top-level declaration.
 */
export interface TypeScriptModuleElement {
  /** Stable identity derived from package, path, kind, and declaration name. */
  readonly id: string;
  /** Declaration or source-unit display name. */
  readonly name: string;
  /** Portable declaration category. */
  readonly kind: TypeScriptDeclarationKind;
  /** Module-local qualified declaration identity. */
  readonly qualifiedName: string;
  /** Parent source-unit identity for a declaration. */
  readonly parentId?: string;
  /** Slash-normalized source path relative to the package root. */
  readonly sourcePath: string;
}

/**
 * Identifies declaration categories emitted by the TypeScript SDK.
 */
export type TypeScriptDeclarationKind =
  | "source-unit"
  | "class"
  | "interface"
  | "enum"
  | "type-alias"
  | "function"
  | "constant"
  | "field";

/**
 * Represents one import relationship from an owned source unit.
 */
export interface TypeScriptModuleRelationship {
  /** Stable relationship identity derived from source and target. */
  readonly id: string;
  /** Owned source-unit element identity. */
  readonly sourceElementId: string;
  /** Portable import relationship category. */
  readonly kind: "imports";
  /** Imported workspace module or external dependency target. */
  readonly target: TypeScriptModuleRelationshipTarget;
}

/**
 * Identifies an imported workspace module or unresolved external package.
 */
export interface TypeScriptModuleRelationshipTarget {
  /** Imported package identity when the specifier names a package. */
  readonly moduleId?: string;
  /** Original normalized module specifier for display. */
  readonly label: string;
}

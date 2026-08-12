import type { TypeScriptModuleModel } from "@starcruisestudios/atlas-ts-sdk/model";

/**
 * Converts TypeScript SDK compatibility values into the closed version-two generated document.
 */
export class VersionTwoTypeScriptModelDocument {
  /**
   * Creates one deterministic schema-compatible model mapping.
   *
   * @param model - Compiler-derived TypeScript model.
   * @returns Closed version-two document value.
   */
  public create(model: TypeScriptModuleModel): object {
    return {
      schemaVersion: 2,
      generator: { name: "atlas-ts", version: "1" },
      source: { language: "typescript" },
      module: {
        id: model.module.id,
        name: model.module.displayName,
        version: model.module.version,
        category: model.module.category,
      },
      elements: model.elements.map((element) => ({
        id: element.id,
        kind: element.kind,
        name: element.name,
        qualifiedName: element.qualifiedName,
        ...(element.parentId === undefined
          ? {}
          : { parentId: element.parentId }),
        source: {
          path: element.sourcePath,
          start: { line: 1, column: 1 },
          end: { line: 1, column: 1 },
        },
        visibility: "unknown",
        ...(element.kind === "function"
          ? {
              signature: {
                typeParameters: [],
                parameters: [],
                returns: { kind: "unknown" },
              },
            }
          : {}),
      })),
      relationships: model.relationships.map((relationship) => ({
        id: relationship.id,
        sourceElementId: relationship.sourceElementId,
        kind: relationship.kind,
        target:
          relationship.target.moduleId === undefined
            ? {
                type: "external",
                id: relationship.target.label,
                name: relationship.target.label,
              }
            : { type: "module", moduleId: relationship.target.moduleId },
      })),
    };
  }
}

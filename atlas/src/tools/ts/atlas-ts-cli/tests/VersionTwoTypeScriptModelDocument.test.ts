import { VersionTwoTypeScriptModelDocument } from "#application/VersionTwoTypeScriptModelDocument.js";
import { describe, expect, it } from "vitest";

/**
 * Verifies TypeScript source paths survive conversion to the version-two model contract.
 */
describe("VersionTwoTypeScriptModelDocument", () => {
  /**
   * Preserves every declaration's package-relative source path for diagram projection.
   */
  it("writes source paths for generated elements", () => {
    const document = new VersionTwoTypeScriptModelDocument().create({
      schemaVersion: 1,
      generatorVersion: "typescript-sdk-1",
      sourceLanguage: "typescript",
      module: {
        id: "@atlas-example/lib",
        displayName: "@atlas-example/lib",
        version: "1.0.0",
        category: "npm-package"
      },
      elements: [
        {
          id: "element:reading-list",
          kind: "class",
          name: "ReadingList",
          qualifiedName: "src/ReadingList.ts:ReadingList",
          sourcePath: "src/ReadingList.ts"
        }
      ],
      relationships: []
    }) as {
      readonly elements: readonly {
        readonly source?: {
          readonly path: string;
          readonly start: { readonly line: number; readonly column: number };
          readonly end: { readonly line: number; readonly column: number };
        };
      }[];
    };

    expect(document.elements[0]?.source).toEqual({
      path: "src/ReadingList.ts",
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    });
  });
});

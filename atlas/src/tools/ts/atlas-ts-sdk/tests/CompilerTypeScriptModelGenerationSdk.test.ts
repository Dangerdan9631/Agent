import { CompilerTypeScriptModelGenerationSdk } from "@starcruisestudios/atlas-ts-sdk/compiler";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Owns isolated workspace setup for compiler-backed SDK contract verification.
 */
class TypeScriptSdkTestWorkspace {
  private rootPath: string | undefined;

  /** Creates a two-package workspace containing a cross-module type import. */
  public async create(): Promise<string> {
    this.rootPath = await mkdtemp(join(tmpdir(), "atlas-ts-sdk-"));
    await this.package(
      "packages/lib",
      "@fixture/lib",
      "export class ReadingListItem {}\n",
    );
    await this.package(
      "packages/app",
      "@fixture/app",
      'import { ReadingListItem } from "@fixture/lib";\nexport class Program { public readonly item = new ReadingListItem(); }\n',
    );
    return this.rootPath;
  }

  /** Removes the temporary workspace when one was created. */
  public async dispose(): Promise<void> {
    if (this.rootPath !== undefined)
      await rm(this.rootPath, { recursive: true, force: true });
  }

  /** Writes one package manifest and implementation source. */
  private async package(
    relativePath: string,
    name: string,
    source: string,
  ): Promise<void> {
    if (this.rootPath === undefined)
      throw new Error("Create the test workspace before adding packages.");
    const packagePath = join(this.rootPath, relativePath);
    await mkdir(join(packagePath, "src"), { recursive: true });
    await writeFile(
      join(packagePath, "package.json"),
      JSON.stringify({ name, version: "1.0.0" }),
    );
    await writeFile(join(packagePath, "src/index.ts"), source);
  }
}

describe("CompilerTypeScriptModelGenerationSdk", () => {
  const workspace = new TypeScriptSdkTestWorkspace();

  afterEach(async () => workspace.dispose());

  it("returns portable models and cross-package imports without writing artifacts", async () => {
    const workspacePath = await workspace.create();
    const result = await new CompilerTypeScriptModelGenerationSdk().generate({
      workspacePath,
      packagePaths: ["packages/app", "packages/lib"],
    });

    expect(result.modules.map((moduleModel) => moduleModel.module.id)).toEqual([
      "@fixture/app",
      "@fixture/lib",
    ]);
    expect(result.modules[0]?.relationships).toContainEqual(
      expect.objectContaining({
        kind: "imports",
        target: { moduleId: "@fixture/lib", label: "@fixture/lib" },
      }),
    );
    expect(result.modules[1]?.elements).toContainEqual(
      expect.objectContaining({ name: "ReadingListItem", kind: "class" }),
    );
  });
});

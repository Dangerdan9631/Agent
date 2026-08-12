import type {
  TypeScriptModelGenerationOptions,
  TypeScriptModelGenerationWorkflow,
} from "#application/TypeScriptModelGenerationWorkflow.js";
import { VersionTwoTypeScriptModelDocument } from "#application/VersionTwoTypeScriptModelDocument.js";
import { CompilerTypeScriptModelGenerationSdk } from "@starcruisestudios/atlas-ts-sdk/compiler";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stringify } from "yaml";

/**
 * Coordinates package-local SDK analysis with atomic model output.
 */
export class SdkTypeScriptModelGenerationWorkflow implements TypeScriptModelGenerationWorkflow {
  /**
   * Creates the workflow from the process-independent TypeScript SDK.
   *
   * @param sdk Generates portable models without performing filesystem output.
   * @param modelDocument Converts SDK facts into the closed generated schema.
   */
  public constructor(
    private readonly sdk = new CompilerTypeScriptModelGenerationSdk(),
    private readonly modelDocument = new VersionTwoTypeScriptModelDocument(),
  ) {}

  /**
   * Loads package-local policy, invokes the SDK, and writes one YAML model.
   *
   * @param options Package, compiler configuration, and output paths supplied by the CLI.
   */
  public async execute(
    options: TypeScriptModelGenerationOptions,
  ): Promise<void> {
    const packagePath = resolve(options.packagePath ?? process.cwd());
    const packageDefinition = this.readPackageDefinition(
      await readFile(resolve(packagePath, "package.json"), "utf8"),
    );
    const tsconfigPath =
      options.tsconfigPath ?? packageDefinition.atlas.tsconfigFile;
    const modelPath = resolve(
      packagePath,
      options.outputPath ?? packageDefinition.atlas.modelFile,
    );
    const result = await this.sdk.generate({
      workspacePath: packagePath,
      packagePaths: ["."],
      tsconfigFile: tsconfigPath,
    });
    const moduleModel = result.modules[0];
    if (moduleModel === undefined || result.modules.length !== 1) {
      throw new Error(
        "Atlas TypeScript generation must produce exactly one package model.",
      );
    }
    await this.writeYaml(modelPath, this.modelDocument.create(moduleModel));
  }

  /** Parses the package identity and closed Atlas npm integration settings. */
  private readPackageDefinition(source: string): TypeScriptPackageDefinition {
    const value = JSON.parse(source) as unknown;
    if (typeof value !== "object" || value === null) {
      throw new Error("TypeScript package.json must contain a JSON object.");
    }
    const record = value as Record<string, unknown>;
    if (typeof record.name !== "string" || record.name.trim().length === 0) {
      throw new Error(
        "Atlas TypeScript packages require a non-empty package name.",
      );
    }
    if (
      typeof record.version !== "string" ||
      record.version.trim().length === 0
    ) {
      throw new Error(
        "Atlas TypeScript packages require a non-empty package version.",
      );
    }
    const atlas = record.atlas;
    if (typeof atlas !== "object" || atlas === null || Array.isArray(atlas)) {
      throw new Error("TypeScript package.json requires an atlas mapping.");
    }
    const integration = atlas as Record<string, unknown>;
    const allowed = new Set(["modelFile", "tsconfigFile", "generateOnBuild"]);
    const unknown = Object.keys(integration).find((key) => !allowed.has(key));
    if (unknown !== undefined) {
      throw new Error(`Unknown TypeScript Atlas setting '${unknown}'.`);
    }
    if (
      typeof integration.modelFile !== "string" ||
      !integration.modelFile.endsWith(".atlas.module.yml")
    ) {
      throw new Error(
        "TypeScript atlas.modelFile must end in .atlas.module.yml.",
      );
    }
    if (
      typeof integration.tsconfigFile !== "string" ||
      integration.tsconfigFile.trim().length === 0
    ) {
      throw new Error(
        "TypeScript atlas.tsconfigFile must be a non-empty path.",
      );
    }
    if (
      integration.generateOnBuild !== undefined &&
      typeof integration.generateOnBuild !== "boolean"
    ) {
      throw new Error("TypeScript atlas.generateOnBuild must be boolean.");
    }
    return {
      name: record.name,
      version: record.version,
      atlas: {
        modelFile: integration.modelFile,
        tsconfigFile: integration.tsconfigFile,
        generateOnBuild: integration.generateOnBuild ?? true,
      },
    };
  }

  /** Writes one deterministic YAML document through a temporary sibling file. */
  private async writeYaml(filePath: string, value: object): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp-${process.pid}`;
    await writeFile(
      temporaryPath,
      stringify(value, { sortMapEntries: false }),
      "utf8",
    );
    await rename(temporaryPath, filePath);
  }
}

/**
 * Contains validated npm package identity and module-local Atlas settings.
 */
interface TypeScriptPackageDefinition {
  /** Required npm package name used as the module identity. */
  readonly name: string;
  /** Required npm package version copied into the generated model. */
  readonly version: string;
  /** Closed package-local Atlas integration settings. */
  readonly atlas: TypeScriptPackageAtlasConfiguration;
}

/**
 * Contains the package-local compiler input and model output configuration.
 */
interface TypeScriptPackageAtlasConfiguration {
  /** Package-relative output ending in `.atlas.module.yml`. */
  readonly modelFile: string;
  /** Package-relative TypeScript compiler configuration path. */
  readonly tsconfigFile: string;
  /** Whether the npm lifecycle integration generates the model during builds. */
  readonly generateOnBuild: boolean;
}

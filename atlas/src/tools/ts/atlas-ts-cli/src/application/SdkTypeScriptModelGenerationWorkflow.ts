import type {
  TypeScriptModelGenerationOptions,
  TypeScriptModelGenerationWorkflow,
} from "#application/TypeScriptModelGenerationWorkflow.js";
import { CompilerTypeScriptModelGenerationSdk } from "@starcruisestudios/atlas-ts-sdk/compiler";
import type { TypeScriptModuleModel } from "@starcruisestudios/atlas-ts-sdk/model";
import fastGlob from "fast-glob";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";

/**
 * Coordinates SDK analysis with YAML configuration discovery and atomic artifact output.
 */
export class SdkTypeScriptModelGenerationWorkflow implements TypeScriptModelGenerationWorkflow {
  /**
   * Creates the workflow from the process-independent TypeScript SDK.
   *
   * @param sdk Generates portable models without performing filesystem output.
   */
  public constructor(
    private readonly sdk = new CompilerTypeScriptModelGenerationSdk(),
  ) {}

  /**
   * Loads workspace policy, invokes the SDK, and writes YAML model documents.
   *
   * @param options Workspace, policy, and output paths supplied by the CLI.
   */
  public async execute(
    options: TypeScriptModelGenerationOptions,
  ): Promise<void> {
    const workspacePath = resolve(options.workspacePath ?? process.cwd());
    const configurationPath = resolve(
      workspacePath,
      options.configurationPath ?? "atlas.config.yml",
    );
    const configuration = this.readConfiguration(
      await readFile(configurationPath, "utf8"),
    );
    const artifactRoot = resolve(
      workspacePath,
      options.outputPath ?? configuration.artifactRoot,
    );
    const packagePaths = await this.discoverPackages(
      workspacePath,
      configuration,
    );
    const result = await this.sdk.generate({ workspacePath, packagePaths });
    const modelDirectoryPath = resolve(artifactRoot, "models");
    await mkdir(modelDirectoryPath, { recursive: true });
    const entries = await Promise.all(
      result.modules.map(async (moduleModel) => {
        const modelPath = resolve(
          modelDirectoryPath,
          `${this.fileName(moduleModel.module.id)}.atlas.module.yml`,
        );
        await this.writeYaml(modelPath, moduleModel);
        return {
          moduleId: moduleModel.module.id,
          modelPath: relative(modelDirectoryPath, modelPath).replaceAll(
            "\\",
            "/",
          ),
        };
      }),
    );
    await this.writeYaml(resolve(modelDirectoryPath, "atlas.manifest.yml"), {
      schemaVersion: 1,
      modules: entries.sort((left, right) =>
        left.moduleId.localeCompare(right.moduleId),
      ),
    });
  }

  /** Parses and validates the configuration surface required by TypeScript source discovery. */
  private readConfiguration(source: string): TypeScriptSourceConfiguration {
    const value = parse(source) as unknown;
    if (typeof value !== "object" || value === null)
      throw new Error("Atlas configuration must be a YAML mapping.");
    const record = value as {
      readonly discovery?: {
        readonly packageGlobs?: unknown;
        readonly excludePackageGlobs?: unknown;
      };
      readonly artifacts?: { readonly root?: unknown };
    };
    const packageGlobs = record.discovery?.packageGlobs;
    if (
      !Array.isArray(packageGlobs) ||
      !packageGlobs.every((entry) => typeof entry === "string")
    ) {
      throw new Error(
        "Atlas TypeScript discovery requires string packageGlobs.",
      );
    }
    const exclusions = record.discovery?.excludePackageGlobs;
    if (
      exclusions !== undefined &&
      (!Array.isArray(exclusions) ||
        !exclusions.every((entry) => typeof entry === "string"))
    ) {
      throw new Error("Atlas excludePackageGlobs must contain strings.");
    }
    const artifactRoot = record.artifacts?.root;
    return {
      packageGlobs,
      excludePackageGlobs: exclusions ?? [],
      artifactRoot:
        typeof artifactRoot === "string" && artifactRoot.length > 0
          ? artifactRoot
          : "architecture",
    };
  }

  /** Resolves configured npm package directories in deterministic relative-path order. */
  private async discoverPackages(
    workspacePath: string,
    configuration: TypeScriptSourceConfiguration,
  ): Promise<readonly string[]> {
    const paths = await fastGlob([...configuration.packageGlobs], {
      cwd: workspacePath,
      onlyDirectories: true,
      unique: true,
      ignore: [...configuration.excludePackageGlobs],
    });
    if (paths.length === 0)
      throw new Error("No TypeScript packages matched Atlas discovery policy.");
    return paths
      .map((value) => value.replaceAll("\\", "/"))
      .sort((left, right) => left.localeCompare(right));
  }

  /** Converts a package identity into a deterministic filesystem-safe filename. */
  private fileName(moduleId: string): string {
    return moduleId.replaceAll(/[^A-Za-z0-9._-]/g, "_");
  }

  /** Writes one deterministic YAML document through a temporary sibling file. */
  private async writeYaml(
    filePath: string,
    value: TypeScriptModuleModel | object,
  ): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp-${process.pid}`;
    await writeFile(
      temporaryPath,
      stringify(value, { sortMapEntries: true }),
      "utf8",
    );
    await rename(temporaryPath, filePath);
  }
}

/**
 * Contains TypeScript source discovery and artifact-root policy loaded from YAML.
 */
interface TypeScriptSourceConfiguration {
  /** Package directory glob patterns relative to the workspace. */
  readonly packageGlobs: readonly string[];
  /** Package directory exclusion patterns relative to the workspace. */
  readonly excludePackageGlobs: readonly string[];
  /** Configured artifact root relative to the workspace. */
  readonly artifactRoot: string;
}

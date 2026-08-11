#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Invokes the dedicated TypeScript CLI as an npm-friendly lifecycle command wrapper.
 */
class AtlasTypeScriptNpmHost {
  /**
   * Forwards user arguments to `atlas-ts generate` without interpreting source behavior.
   *
   * @param argumentsToForward - Arguments supplied after the npm wrapper executable.
   * @returns Process-compatible completion status.
   */
  public run(argumentsToForward: readonly string[]): Promise<number> {
    return new Promise((resolveCompletion, reject) => {
      const cliPath = fileURLToPath(
        import.meta.resolve("@starcruisestudios/atlas-ts-cli"),
      );
      const child = spawn(
        process.execPath,
        [cliPath, "generate", ...argumentsToForward],
        {
          stdio: "inherit",
        },
      );
      child.once("error", reject);
      child.once("exit", (code) => resolveCompletion(code ?? 1));
    });
  }
}

process.exitCode = await new AtlasTypeScriptNpmHost().run(
  process.argv.slice(2),
);

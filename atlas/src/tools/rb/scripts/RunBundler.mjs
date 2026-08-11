import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Invokes Bundler consistently from the Ruby generator directory.
 */
class RubyBundleRunner {
  /**
   * Creates the runner from raw Bundler arguments.
   *
   * @param {readonly string[]} argumentsToForward - Arguments passed directly to Bundler.
   */
  constructor(argumentsToForward) {
    this.argumentsToForward = argumentsToForward;
  }

  /**
   * Starts Bundler and returns its process exit code.
   *
   * @returns {Promise<number>} Exit status reported by Bundler.
   */
  run() {
    const selection = this.selection();
    const invocation = this.invocation(selection.arguments);
    return new Promise((resolveExitCode, reject) => {
      const child = spawn(invocation.executable, invocation.arguments, {
        cwd: selection.workingDirectory,
        stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (code) => resolveExitCode(code ?? 1));
    });
  }

  /**
   * Selects a platform-safe Bundler process invocation.
   *
   * @param {readonly string[]} argumentsToForward - Bundler arguments after the executable.
   * @returns {{ readonly executable: string; readonly arguments: readonly string[] }} Process invocation.
   */
  invocation(argumentsToForward) {
    if (process.platform !== "win32") {
      return { executable: "bundle", arguments: argumentsToForward };
    }
    return {
      executable: "cmd.exe",
      arguments: ["/d", "/c", "call", "bundle.bat", ...argumentsToForward],
    };
  }

  /**
   * Selects the generator bundle or an explicitly named repository project.
   *
   * @returns {{ readonly workingDirectory: string; readonly arguments: readonly string[] }} Bundler invocation.
   */
  selection() {
    const generatorRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const projectIndex = this.argumentsToForward.indexOf("--project");
    if (projectIndex < 0) {
      return {
        workingDirectory: generatorRoot,
        arguments: this.argumentsToForward,
      };
    }
    const projectPath = this.argumentsToForward[projectIndex + 1];
    if (projectPath === undefined || projectPath.startsWith("-")) {
      throw new Error("RunBundler requires a path after --project.");
    }
    return {
      workingDirectory: resolve(process.cwd(), projectPath),
      arguments: this.argumentsToForward.filter(
        (_, index) => index !== projectIndex && index !== projectIndex + 1,
      ),
    };
  }
}

process.exitCode = await new RubyBundleRunner(process.argv.slice(2)).run();

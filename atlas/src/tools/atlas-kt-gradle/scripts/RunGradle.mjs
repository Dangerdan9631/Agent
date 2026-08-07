import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Invokes the repository-owned Gradle wrapper consistently from npm workspace scripts.
 */
class GradleWorkspaceRunner {
  /**
   * Creates a runner from command-line arguments after the Node executable.
   *
   * @param {readonly string[]} argumentsToParse - Optional project selector followed by Gradle task arguments.
   */
  constructor(argumentsToParse) {
    this.argumentsToParse = argumentsToParse;
  }

  /**
   * Starts Gradle and returns its process exit code.
   *
   * @returns {Promise<number>} Exit status reported by the Gradle wrapper.
   */
  async run() {
    const invocation = this.createInvocation();
    return new Promise((resolveExitCode, reject) => {
      const processHandle = spawn(invocation.executable, invocation.arguments, {
        cwd: invocation.workingDirectory,
        stdio: 'inherit'
      });
      processHandle.once('error', reject);
      processHandle.once('exit', (code) => resolveExitCode(code ?? 1));
    });
  }

  /**
   * Selects the platform wrapper and an optional Gradle project directory.
   *
   * @returns {{ readonly executable: string; readonly arguments: readonly string[]; readonly workingDirectory: string }} Resolved process invocation.
   */
  createInvocation() {
    const directoryPath = dirname(fileURLToPath(import.meta.url));
    const wrapperRootPath = resolve(directoryPath, '..', '..');
    const selection = this.createSelection();
    const wrapperName = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
    const wrapperPath = resolve(wrapperRootPath, wrapperName);
    const gradleArguments = [
      ...(selection.projectPath === undefined ? [] : ['-p', selection.projectPath]),
      ...selection.taskArguments
    ];
    if (process.platform !== 'win32') {
      return {
        executable: wrapperPath,
        arguments: gradleArguments,
        workingDirectory: wrapperRootPath
      };
    }
    return {
      executable: 'cmd.exe',
      arguments: ['/d', '/c', 'call', wrapperPath, ...gradleArguments],
      workingDirectory: wrapperRootPath
    };
  }

  /**
   * Parses the one repository project option without interpreting Gradle task options.
   *
   * @returns {{ readonly projectPath: string | undefined; readonly taskArguments: readonly string[] }} Project and task arguments.
   */
  createSelection() {
    const projectOptionIndex = this.argumentsToParse.indexOf('--project');
    if (projectOptionIndex < 0) {
      return { projectPath: undefined, taskArguments: this.argumentsToParse };
    }
    const projectPath = this.argumentsToParse[projectOptionIndex + 1];
    if (projectPath === undefined || projectPath.startsWith('-')) {
      throw new Error('RunGradle requires a path after --project.');
    }
    return {
      projectPath: resolve(process.cwd(), projectPath),
      taskArguments: this.argumentsToParse.filter(
        (_, index) => index !== projectOptionIndex && index !== projectOptionIndex + 1
      )
    };
  }
}

/**
 * Runs the requested Gradle invocation through the platform-specific wrapper.
 */
const exitCode = await new GradleWorkspaceRunner(process.argv.slice(2)).run();
process.exitCode = exitCode;

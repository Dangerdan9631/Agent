import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTempDir, readText, removeDir, withTempHome } from '../test-utils';
import { runCli } from './cli-test-utils';
import { writeGeneratorFixture, writeNativeFixture } from './fixtures';

export interface CliTargetCase {
  target: string;
  generate: {
    expectedFileCount: number;
    checks: Array<{ path: string; contains: string[] }>;
  };
  initialize: {
    expectedSummary: string;
    checks: Array<{ path: string; contains: string[] }>;
  };
}

export function defineCliTargetSuite(testCase: CliTargetCase): void {
  const tempDirs: string[] = [];
  let restoreHome: (() => void) | undefined;

  function useTempHome(): void {
    const homeDir = createTempDir(`agentconfig-${testCase.target}-home-`);
    tempDirs.push(homeDir);
    restoreHome = withTempHome(homeDir);
  }

  afterEach(() => {
    restoreHome?.();
    restoreHome = undefined;

    while (tempDirs.length > 0) {
      removeDir(tempDirs.pop() as string);
    }
  });

  describe(`${testCase.target} CLI behavior`, () => {
    it('generates target artifacts through the CLI', async () => {
      const projectDir = createTempDir(`agentconfig-generate-${testCase.target}-`);
      tempDirs.push(projectDir);
      useTempHome();

      writeGeneratorFixture(projectDir, testCase.target);

      const result = await runCli([
        'generate',
        '--config',
        path.join(projectDir, '.agentconfig'),
        '--verbose',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Generated ${testCase.generate.expectedFileCount} file(s)`);

      for (const check of testCase.generate.checks) {
        const content = readText(projectDir, `generated/${check.path}`);
        for (const expectedText of check.contains) {
          expect(content).toContain(expectedText);
        }
      }
    });

    it('initializes .agentconfig through the CLI for that target', async () => {
      const projectDir = createTempDir(`agentconfig-init-${testCase.target}-`);
      tempDirs.push(projectDir);
      useTempHome();

      writeNativeFixture(projectDir, testCase.target);

      const result = await runCli([
        'initialize',
        projectDir,
        '--from',
        testCase.target,
        '--verbose',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(testCase.initialize.expectedSummary);

      for (const check of testCase.initialize.checks) {
        const content = readText(projectDir, check.path);
        for (const expectedText of check.contains) {
          expect(content).toContain(expectedText);
        }
      }
    });
  });
}

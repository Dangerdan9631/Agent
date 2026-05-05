import { describe, expect, it } from 'vitest';
import { runCli } from './cli-test-utils';

describe('generate CLI options', () => {
  it('exposes current output options', async () => {
    const result = await runCli(['generate', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--project-root <path>');
  });
});

describe('initialize CLI options', () => {
  it('exposes current initialize options', async () => {
    const result = await runCli(['initialize', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[options] [project-root]');
    expect(result.stdout).toContain('--config <path>');
    expect(result.stdout).toContain('--target <agent>');
  });
});

describe('translate CLI options', () => {
  it('exposes current translate options', async () => {
    const result = await runCli(['translate', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--source-target <name>');
    expect(result.stdout).toContain('--dest-target <name>');
    expect(result.stdout).toContain('--project-root <path>');
  });
});

describe('verbose CLI options', () => {
  it('exposes --verbose on validate, diff, import, and translate', async () => {
    const validateHelp = await runCli(['validate', '--help']);
    const diffHelp = await runCli(['diff', '--help']);
    const importHelp = await runCli(['import', '--help']);
    const translateHelp = await runCli(['translate', '--help']);

    expect(validateHelp.exitCode).toBe(0);
    expect(validateHelp.stdout).toContain('-v, --verbose');

    expect(diffHelp.exitCode).toBe(0);
    expect(diffHelp.stdout).toContain('-v, --verbose');

    expect(importHelp.exitCode).toBe(0);
    expect(importHelp.stdout).toContain('-v, --verbose');

    expect(translateHelp.exitCode).toBe(0);
    expect(translateHelp.stdout).toContain('-v, --verbose');
  });
});

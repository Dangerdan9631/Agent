import { describe, expect, it } from 'vitest';
import { runCli } from './cli-test-utils';

describe('generate CLI options', () => {
  it('does not expose deprecated --out', async () => {
    const result = await runCli(['generate', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--project-root <path>');
    expect(result.stdout).not.toContain('--out <path>');
    expect(result.stdout).not.toContain('--no-overwrite');
  });

  it('rejects deprecated --out', async () => {
    const result = await runCli(['generate', '--out', '.']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--out'");
  });

  it('rejects removed --no-overwrite', async () => {
    const result = await runCli(['generate', '--no-overwrite']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--no-overwrite'");
  });
});

describe('initialize CLI options', () => {
  it('does not expose removed overwrite or dry-run flags', async () => {
    const result = await runCli(['initialize', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('--overwrite');
    expect(result.stdout).not.toContain('--dry-run');
  });

  it('rejects removed --overwrite', async () => {
    const result = await runCli(['initialize', '--overwrite']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--overwrite'");
  });

  it('rejects removed --dry-run', async () => {
    const result = await runCli(['initialize', '--dry-run']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("unknown option '--dry-run'");
  });
});

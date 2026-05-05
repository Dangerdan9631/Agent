import type { IR } from 'agentconfig-api';
import type { AgentConfig } from 'agentconfig-api';
import { registry } from './registry';

export type { ValidationLevel, ValidationResult } from 'agentconfig-api';
import type { ValidationResult } from 'agentconfig-api';

const VALID_ACTIVATIONS = new Set(['always', 'scoped', 'ai-decided', 'manual']);

/**
 * Validate a parsed IR against the agent config.
 * Returns an array of ValidationResult entries (errors, warnings, and infos).
 * An empty array means validation passed cleanly.
 */
export function validate(ir: IR, config: AgentConfig): ValidationResult[] {
  const results: ValidationResult[] = [];

  // ── Instruction-level checks ───────────────────────────────────────────────
  for (const inst of ir.instructions) {
    if (!VALID_ACTIVATIONS.has(inst.activation)) {
      results.push({
        level: 'error',
        message: `Invalid activation "${inst.activation}". Must be one of: always, scoped, ai-decided, manual.`,
        file: inst.sourcePath,
      });
    }

    if (inst.activation === 'scoped' && (!inst.globs || inst.globs.length === 0)) {
      results.push({
        level: 'error',
        message: '"globs" is required when activation is "scoped".',
        file: inst.sourcePath,
      });
    }

    if (inst.activation === 'ai-decided' && !inst.description) {
      results.push({
        level: 'error',
        message: '"description" is required when activation is "ai-decided".',
        file: inst.sourcePath,
      });
    }

    // Determine which configured targets will receive this instruction
    const effectiveTargets = config.targets.filter((t) => {
      if (inst.targets && inst.targets.length > 0 && !inst.targets.includes(t)) return false;
      if (inst.excludedTargets && inst.excludedTargets.includes(t)) return false;
      return true;
    });

    const bodyLen = inst.body.length;

    // Antigravity: 12,000 char limit per rule file
    if (effectiveTargets.includes('antigravity') && bodyLen > 12_000) {
      results.push({
        level: 'warning',
        message: `Antigravity rule file exceeds 12,000 character limit (${bodyLen} chars).`,
        file: inst.sourcePath,
      });
    }

    // Windsurf: 12,000 char limit per rule file
    if (effectiveTargets.includes('windsurf') && bodyLen > 12_000) {
      results.push({
        level: 'warning',
        message: `Windsurf rule file exceeds 12,000 character limit (${bodyLen} chars).`,
        file: inst.sourcePath,
      });
    }

    // Cursor: 6,000 for always-on global; 12,000 for project rules
    if (effectiveTargets.includes('cursor')) {
      if (inst.activation === 'always' && bodyLen > 6_000) {
        results.push({
          level: 'warning',
          message: `Cursor always-on rule exceeds the 6,000-character global limit (${bodyLen} chars). Consider splitting or using activation: scoped.`,
          file: inst.sourcePath,
        });
      } else if (bodyLen > 12_000) {
        results.push({
          level: 'warning',
          message: `Cursor rule file exceeds 12,000 character limit (${bodyLen} chars).`,
          file: inst.sourcePath,
        });
      }
    }
  }

  // ── Hook-level checks ──────────────────────────────────────────────────────
  const hasCodex = config.targets.includes('codex');

  if (hasCodex && ir.hooks.length > 0) {
    if (process.platform === 'win32') {
      results.push({
        level: 'warning',
        message:
          'Codex hooks are disabled on Windows. Hook files will be generated but will not execute.',
      });
    }

    results.push({
      level: 'info',
      message:
        'Codex hooks require `codex_hooks = true` in ~/.codex/config.toml to be activated.',
    });
  }

  // ── Cross-target checks ────────────────────────────────────────────────────

  // CLAUDE.md double-load: if both claude-code and codex targets are active, the generated
  // CLAUDE.md may be double-loaded if the user has it in project_doc_fallback_filenames.
  if (
    config.targets.includes('claude-code') &&
    config.targets.includes('codex')
  ) {
    results.push({
      level: 'warning',
      message:
        'Both claude-code and codex targets are active. If "CLAUDE.md" is listed in ' +
        "Codex's project_doc_fallback_filenames, Claude Code's always-on instructions may be " +
        'double-loaded by Codex.',
    });
  }

  // ── Directive type plugin checks ──────────────────────────────────────────
  for (const plugin of registry.listDirectiveTypes()) {
    if (plugin.validate) {
      const items = ir.extensions[plugin.typeId] ?? [];
      results.push(...plugin.validate(items, config));
    }
  }

  return results;
}

# Google Antigravity — Agent Directive Files

> Researched from official documentation and agentskills.io, April 2026.

## Overview

**Google Antigravity** is a standalone, agent-first IDE built around an AI coding agent powered by Gemini. Unlike IDE extensions, Antigravity is purpose-built for agent-first development workflows.

- **Website**: [antigravity.google](https://antigravity.google)
- **Docs**: [antigravity.google/docs/home](https://antigravity.google/docs/home)

---

## File Structure

```
~/.gemini/
├── GEMINI.md                                    # User global instructions (shared with Gemini CLI)
└── antigravity/
    └── skills/
        └── <skill-folder>/
            └── SKILL.md                         # User global skills

<project>/
└── .agents/                                     # Primary workspace config (current)
    ├── rules/
    │   └── *.md                                 # Workspace rules
    └── skills/
        └── <skill-folder>/
            └── SKILL.md                         # Project skills

.agent/                                          # Legacy paths (singular — still supported)
├── rules/
│   └── *.md
└── skills/
    └── <skill-folder>/
        └── SKILL.md
```

> **Note**: Antigravity defaults to `.agents/` (plural) but maintains backward compatibility with the older `.agent/` (singular) paths.

---

## Global Instructions

The global instructions file is `~/.gemini/GEMINI.md` — the same file used by the **Gemini CLI**. Instructions placed here are applied across all Antigravity workspaces and all Gemini CLI sessions for the user.

- **Path**: `~/.gemini/GEMINI.md`
- **Format**: Plain Markdown
- **Scope**: All workspaces, all sessions

---

## Workspace Rules (`.agents/rules/`)

Workspace rules are Markdown files in the `.agents/rules/` directory of a project. Rules allow you to guide the agent's behavior for specific tasks, stacks, coding styles, and project conventions.

- **Primary location**: `.agents/rules/`
- **Legacy location**: `.agent/rules/` (still supported)
- **File format**: Markdown (`.md`)
- **Character limit**: 12,000 characters per rule file

### Activation Modes

Each rule file supports one of four activation modes, specified in YAML frontmatter:

| Mode | Description |
|------|-------------|
| **Always On** | Automatically included in every conversation |
| **Manual** | Only applied when @-mentioned by name in the agent input |
| **Model Decision** | The model decides whether to apply the rule based on its `description` field |
| **Glob** | Applied when the active file matches a specified glob pattern |

### Rule File Frontmatter Examples

#### Always On

Applied to every conversation automatically, no @-mention required.

```markdown
---
activation: always
---

# TypeScript Conventions

Always use strict TypeScript. Prefer `interface` over `type` for object shapes.
Never use `any` — use `unknown` and narrow with type guards.
```

#### Manual

Only applied when the user explicitly @-mentions the rule by filename in the agent input.

```markdown
---
activation: manual
---

# Database Migration Guide

When running migrations:
1. Back up the current schema
2. Run `npm run migrate:dry` first to preview changes
3. Apply with `npm run migrate`
4. Verify row counts after migration
```

#### Model Decision

The model reads the `description` field and decides whether the rule is relevant to the current task.

```markdown
---
activation: model
description: Apply when writing or reviewing React components, hooks, or JSX files.
---

# React Component Conventions

- Prefer functional components with hooks over class components
- Co-locate component styles in a `.module.css` file with the same name
- Export components as named exports, not default exports
- Use `React.FC` only when children props are needed
```

#### Glob

Applied automatically when the active file matches the specified glob pattern.

```markdown
---
activation: glob
glob: "**/*.test.ts"
---

# Test File Conventions

All test files must follow these conventions:
- Use `describe` blocks to group related tests
- Use `it` (not `test`) for individual cases
- Mock external dependencies at the top of the file
- Assert on the result, not the implementation
```

---

## `@filename` Imports

Rule files support importing other files using `@filename` syntax. This allows you to share common content across multiple rules or reference reference documents.

### Resolution Rules

- **Relative path**: Resolved relative to the location of the rule file
- **Absolute path** (starts with `/`): First attempted as a true filesystem absolute path; if that file does not exist, resolved relative to the workspace/repository root

### Example

```markdown
---
activation: always
---

# Project Standards

@docs/coding-standards.md

@/shared/team-conventions.md

All code must comply with the above standards before being committed.
```

In the example above:
- `@docs/coding-standards.md` resolves relative to the rule file's location
- `@/shared/team-conventions.md` resolves to `/shared/team-conventions.md` on disk first, falling back to `<workspace-root>/shared/team-conventions.md`

---

## AGENTS.md Support

`AGENTS.md` is not explicitly documented in Antigravity's official docs as a primary loading mechanism. The primary workspace rules convention is `.agents/rules/`.

Community tooling and workflow conventions sometimes place an `AGENTS.md` at the repository root as a bootstrap entry point alongside `.agents/rules/`, but this is not an officially documented behavior for Antigravity.

---

## Workflows

Workflows are a related feature that provide structured, multi-step sequences of agent instructions, distinct from rules.

- Saved as Markdown files in `.agents/workflows/` (workspace) or a global equivalent
- Invoked via slash command: `/workflow-name`
- Can call other workflows: e.g., a step in `/deploy` can call `/pre-deploy-checks`
- **Character limit**: 12,000 characters per workflow file
- Can be agent-generated from conversation history

Workflows differ from rules: **rules** provide persistent context at the prompt level; **workflows** guide the model through a trajectory of interconnected steps.

---

## Skills

Skills are reusable packages of knowledge that extend what the agent can do. Antigravity follows the [agentskills.io](https://agentskills.io) open standard for skills.

### How Skills Work (Progressive Disclosure)

1. **Discovery** — At startup, the agent loads only the `name` and `description` of each available skill
2. **Activation** — If a skill's description matches the current task, the agent reads the full `SKILL.md` into context
3. **Execution** — The agent follows the skill's instructions, optionally running bundled scripts or loading referenced files

### Skill Locations

| Location | Scope |
|----------|-------|
| `<project>/.agents/skills/<skill-folder>/` | Workspace-specific |
| `~/.gemini/antigravity/skills/<skill-folder>/` | Global (all workspaces) |
| `<project>/.agent/skills/<skill-folder>/` | Legacy workspace path (still supported) |

### Skill Folder Structure

```
.agents/skills/my-skill/
├── SKILL.md         # Main instructions (required)
├── scripts/         # Helper scripts (optional)
├── examples/        # Reference implementations (optional)
├── references/      # Documentation references (optional)
└── resources/       # Templates and other assets (optional)
```

The agent can read any of these files when following the skill's instructions.

### `SKILL.md` Format

Every skill requires a `SKILL.md` file with YAML frontmatter:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Unique identifier (lowercase, hyphens for spaces). Defaults to folder name. |
| `description` | **Yes** | What the skill does and when to use it. This is what the agent sees during discovery. |

Write descriptions in third person and include keywords that help the agent recognize when the skill is relevant.

#### Example: Code Review Skill

```markdown
---
name: code-review
description: Reviews code changes for bugs, style issues, and best practices. Use when reviewing PRs or checking code quality.
---

# Code Review Skill

When reviewing code, follow these steps:

## Review checklist

1. **Correctness**: Does the code do what it's supposed to?
2. **Edge cases**: Are error conditions handled?
3. **Style**: Does it follow project conventions?
4. **Performance**: Are there obvious inefficiencies?

## How to provide feedback

- Be specific about what needs to change
- Explain why, not just what
- Suggest alternatives when possible
```

#### Example: Python Test Generation Skill

```markdown
---
name: pytest-generator
description: Generates unit tests for Python code using pytest conventions. Use when writing or scaffolding tests for Python modules or functions.
---

# Pytest Generator Skill

## When to use this skill

- Writing new unit tests for Python functions or classes
- Scaffolding test files for untested modules
- Filling gaps in test coverage

## Conventions

- Place test files in `tests/` mirroring the source tree
- Use `pytest.mark.parametrize` for data-driven tests
- Prefer fixtures over setup/teardown methods
- Use `pytest-mock` for mocking; avoid `unittest.mock` directly

## Steps

1. Identify the module under test
2. Determine public API surface (functions, classes, methods)
3. Create test file at `tests/<module_path>/test_<filename>.py`
4. Write one test class per class under test; use functions for module-level functions
5. Cover happy path, edge cases, and expected exceptions
```

#### Skill Best Practices

- **Keep skills focused**: One skill per distinct task or domain
- **Write clear descriptions**: The description is the discovery signal — be specific about when the skill is useful
- **Use scripts as black boxes**: If your skill includes scripts, instruct the agent to run `--help` first rather than reading the full source
- **Include decision trees**: For complex skills, add a section guiding the agent to choose the right approach based on context

---

## Subagents

Antigravity supports subagent delegation. The **Browser Subagent** is officially documented and allows the agent to open, navigate, and interact with web pages as part of a task.

- **Browser Subagent docs**: [antigravity.google/docs/browser-subagent](https://antigravity.google/docs/browser-subagent)
- Additional subagent types are visible in the documentation sidebar

---

## Hooks

**Hooks are not supported.** Antigravity has no lifecycle hook system. There is no mechanism to run shell commands, HTTP callbacks, or LLM prompts at agent loop events (session start/end, pre/post tool use, etc.).

---

## Capabilities Summary

| Feature | Supported | Notes |
|---------|-----------|-------|
| Global instructions | ✅ | `~/.gemini/GEMINI.md` (shared with Gemini CLI) |
| Workspace rules | ✅ | `.agents/rules/*.md` |
| Pathed/globbed rules | ✅ | `activation: glob` with `glob:` frontmatter field |
| `@file` imports | ✅ | `@filename` in rule files; relative and workspace-absolute paths |
| Skills | ✅ | `.agents/skills/` following agentskills.io standard |
| Global skills | ✅ | `~/.gemini/antigravity/skills/` |
| Legacy `.agent/` paths | ✅ | Both `.agent/rules/` and `.agent/skills/` still supported |
| Subagents | ✅ | Browser Subagent documented; others in sidebar |
| Workflows | ✅ | `.agents/workflows/`; invoked via `/workflow-name` |
| Hooks | ❌ | No lifecycle hook system |
| `AGENTS.md` standard | ❓ | Not officially documented in Antigravity docs; community tools use `AGENTS.md` as a bootstrap file alongside `.agents/rules/` |
| `agentskills.io` standard | ✅ | Native implementation; `.agents/skills/<folder>/SKILL.md` follows the agentskills.io open standard |

---

## Sources

- [Rules / Workflows — antigravity.google/docs/rules-workflows](https://antigravity.google/docs/rules-workflows)
- [Skills — antigravity.google/docs/skills](https://antigravity.google/docs/skills)
- [Browser Subagent — antigravity.google/docs/browser-subagent](https://antigravity.google/docs/browser-subagent)
- [Agent Skills open standard — agentskills.io](https://agentskills.io)
- [agentskills.io Specification — agentskills.io/specification](https://agentskills.io/specification)

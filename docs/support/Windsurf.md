# Windsurf (Codeium) — Coding Agent Directive Files

> Documentation for Windsurf IDE by Codeium.
> **Tool**: Windsurf IDE — [windsurf.com](https://windsurf.com)

---

## Overview

Windsurf is an agent-first IDE by Codeium, designed to keep developers "in the flow" with deep AI integration. **Cascade** is Windsurf's agentic AI assistant, capable of autonomous code editing, tool calling, web search, and long-horizon task planning.

Cascade operates in two modes:
- **Code mode** — creates and edits files, runs commands, and modifies the codebase
- **Chat mode** — answers questions and explains code without direct edits

Windsurf provides a rich customization system with five distinct mechanisms for steering Cascade behavior: **Rules**, **AGENTS.md**, **Memories**, **Skills**, and **Workflows**.

---

## File Structure

```
# Global (machine-wide, not committed to repo)
~/.codeium/windsurf/
├── memories/
│   ├── global_rules.md              # Global rules (always-on, 6,000 char limit)
│   └── <workspace-hash>/            # Auto-generated memories per workspace
├── skills/
│   └── <skill-name>/
│       └── SKILL.md                 # Global skill definitions
└── global_workflows/
    └── *.md                         # Global workflow definitions

# Per-project (committed to repo)
<project>/
├── .windsurf/
│   ├── rules/
│   │   └── *.md                     # Workspace rules (frontmatter required, 12,000 char limit each)
│   ├── skills/
│   │   └── <skill-name>/
│   │       ├── SKILL.md             # Skill definition
│   │       └── <support-files>      # Scripts, templates, checklists, etc.
│   └── workflows/
│       └── *.md                     # Workflow definitions
├── AGENTS.md                        # Root-level instructions (always-on)
└── <subdir>/
    └── AGENTS.md                    # Directory-scoped instructions (auto-glob)

# Enterprise (system-wide, read-only for end users)
# macOS:   /Library/Application Support/Windsurf/{rules,skills,workflows}/
# Linux:   /etc/windsurf/{rules,skills,workflows}/
# Windows: C:\ProgramData\Windsurf\{rules,skills,workflows}\
```

> **Legacy note**: Older versions of Windsurf used a single `.windsurfrules` file at the project root. This has been superseded by the `.windsurf/rules/*.md` system with activation modes. The `.windsurfrules` format is no longer documented in current Windsurf docs.

---

## Global Instructions

Global rules are stored in `~/.codeium/windsurf/memories/global_rules.md`. This file is:
- Managed through the **Windsurf Settings UI** (accessible via the Customizations panel in Cascade, or "Windsurf - Settings" in the bottom-right corner)
- Applied as **always-on** to every workspace and conversation
- Limited to **6,000 characters**
- Not file-based in the traditional sense — it lives in Codeium's local data directory, not in any project repository

To set global rules:
1. Open Cascade (`Cmd/Ctrl+L`)
2. Click the **Customizations** icon (top-right slider menu) → **Rules** panel
3. Click **+ Global** to create or edit the global rules file

---

## Workspace Rules (`.windsurf/rules/*.md`)

Workspace rules are individual Markdown files placed in `.windsurf/rules/` at (or below) the project root. Each file represents one rule set and must include YAML frontmatter specifying an activation mode.

| Property | Value |
|----------|-------|
| **Location** | `.windsurf/rules/*.md` (workspace, subdirectories, or parent dirs up to git root) |
| **Format** | Markdown with YAML frontmatter |
| **Limit** | 12,000 characters per file |
| **Activation** | Controlled by `trigger` field in frontmatter |

### Activation Modes

| Mode | `trigger` value | Behavior | Context cost |
|------|----------------|----------|-------------|
| Always On | `always_on` | Full content in system prompt on every message | Every message |
| Model Decision | `model_decision` | Description shown always; full content loaded when Cascade decides it's relevant | Low (description only until invoked) |
| Glob | `glob` | Applied only when Cascade reads/edits files matching `globs` pattern | Only when matching files are touched |
| Manual | `manual` | Not in system prompt; activated by typing `@rule-name` in Cascade | Only when @mentioned |

### Example: Always-On Rule

```markdown
---
trigger: always_on
---

# Project Conventions

- Language: TypeScript with strict mode enabled
- Package manager: pnpm (never npm or yarn)
- Use named exports; avoid default exports
- All functions must have JSDoc comments
```

### Example: Glob Rule (test files only)

```markdown
---
trigger: glob
globs: **/*.test.ts
---

All test files must use `describe`/`it` blocks and mock all external API calls.
Use `vi.fn()` for mocks (Vitest project). Never call real network endpoints in tests.
```

### Example: Model-Decision Rule

```markdown
---
trigger: model_decision
description: Guidelines for working with the database layer and ORM
---

# Database Guidelines

- Use Prisma ORM for all database operations
- Never write raw SQL unless absolutely necessary
- All migrations must be reviewed before applying to production
- Use transactions for multi-step writes
```

### Best Practices

- Keep rules simple, concise, and specific — vague rules confuse Cascade
- Use bullet points, numbered lists, and Markdown headers
- XML tags can group related rules:

```markdown
<coding_guidelines>
- Language: Python 3.12+
- Use early returns to reduce nesting
- All public functions must have type annotations
</coding_guidelines>

<testing_guidelines>
- Use pytest with fixtures
- Target 80% coverage for new code
</testing_guidelines>
```

---

## AGENTS.md

Windsurf natively supports `AGENTS.md` files. They are processed by the same Rules engine as `.windsurf/rules/`, but with **automatic scoping based on file location** — no frontmatter required.

| Location | Behavior |
|----------|----------|
| Project root (`/AGENTS.md`) | Always-on — full content included in every message |
| Subdirectory (`/frontend/AGENTS.md`) | Auto-glob — applied only when Cascade works with files in `/frontend/**` |

Both `AGENTS.md` and `agents.md` (case-insensitive) are recognized. Windsurf searches from the current workspace down through subdirectories, and up to the git root for parent-level files.

### Example Directory Structure

```
my-project/
├── AGENTS.md                    # Global project instructions (always-on)
├── frontend/
│   ├── AGENTS.md                # Frontend-specific instructions
│   └── src/components/
│       └── AGENTS.md            # Component-specific conventions
├── backend/
│   └── AGENTS.md                # Backend-specific instructions
└── docs/
    └── AGENTS.md                # Documentation conventions
```

### Example: Root `AGENTS.md`

```markdown
# Project Instructions

## Stack
- Frontend: React 18 + TypeScript + Vite
- Backend: FastAPI (Python 3.12)
- Database: PostgreSQL via Prisma

## Conventions
- All API routes follow REST naming conventions
- Use `Result<T, E>` pattern for error handling
- Never commit secrets or API keys
```

### Example: Subdirectory `AGENTS.md`

```markdown
# Component Guidelines

When working with components in this directory:

- Use functional components with hooks only
- Naming: `ComponentName.tsx` for components, `useHookName.ts` for hooks
- Each component must have a corresponding test: `ComponentName.test.tsx`
- Use CSS Modules for styling: `ComponentName.module.css`
- Export as named exports, not default exports
```

---

## Memories

Cascade can autonomously create and update **memories** during conversations — short facts it believes are useful to retain across sessions.

| Property | Value |
|----------|-------|
| **Storage** | `~/.codeium/windsurf/memories/<workspace-hash>/` |
| **Scope** | Per-workspace (not shared between workspaces) |
| **Persistence** | Local machine only — not committed to repo |
| **Credit cost** | Creating/using memories does **not** consume credits |

### How Memories Work

- Cascade **automatically generates** memories when it encounters context worth remembering (e.g., "user prefers spaces over tabs", "this project uses bun not npm")
- You can explicitly ask: _"Create a memory of how we handle authentication in this project"_
- Memories are **retrieved automatically** when Cascade decides they're relevant to the current task
- Memories can be viewed and edited in the **Customizations panel** → **Memories** tab

### Memories vs. Rules

| | Memories | Rules |
|-|----------|-------|
| Created by | Cascade (auto) or user request | User only |
| Version controlled | No (local only) | Yes (`.windsurf/rules/`) |
| Team-shareable | No | Yes |
| Explicit control | Low | Full |
| Best for | One-off facts Cascade picked up | Durable conventions and standards |

> **Recommendation**: For knowledge you want Cascade to reliably reuse across your team, write it as a Rule or add it to `AGENTS.md`. Rules are version-controlled, shareable, and give you explicit control over activation.

---

## Skills

Skills bundle multi-step procedures with supporting files (scripts, templates, checklists) that Cascade can invoke autonomously or on demand. Windsurf's Skills implementation is compatible with the [agentskills.io](https://agentskills.io) specification.

| Property | Value |
|----------|-------|
| **Location** | `.windsurf/skills/<skill-name>/SKILL.md` (workspace) or `~/.codeium/windsurf/skills/<skill-name>/SKILL.md` (global) |
| **Format** | Markdown with YAML frontmatter (`name`, `description`) |
| **Invocation** | Automatic (Cascade decides based on description) or manual via `@skill-name` |
| **Context cost** | Progressive — only `name` + `description` shown until invoked |
| **Cross-agent** | Also scans `.agents/skills/` and `~/.agents/skills/` for compatibility |

### `SKILL.md` Format

```markdown
---
name: deploy-to-staging
description: Guides the deployment process to the staging environment with pre-flight checks
---

## Pre-deployment Checklist
1. Run all tests: `pnpm test`
2. Check for uncommitted changes
3. Verify environment variables are set

## Deployment Steps
1. Build the project: `pnpm build`
2. Run database migrations: `pnpm prisma migrate deploy`
3. Deploy via SSH: `./scripts/deploy.sh staging`
4. Verify health endpoint: `curl https://staging.example.com/health`

## Rollback
If deployment fails, run: `./scripts/rollback.sh staging`
See rollback-procedure.md for detailed steps.
```

### Example Skill with Supporting Files

```
.windsurf/skills/deploy-to-staging/
├── SKILL.md                     # Skill definition and steps
├── pre-deploy-checks.sh         # Pre-deployment validation script
├── environment-template.env     # Environment variable template
└── rollback-procedure.md        # Detailed rollback instructions
```

### Invoking Skills

- **Automatic**: Cascade invokes the skill when your request matches the `description`
- **Manual**: Type `@skill-name` in the Cascade input box (e.g., `@deploy-to-staging`)

---

## Workflows

Workflows define reusable sequences of steps for repetitive multi-step tasks, invoked manually via slash commands. Unlike Skills, Cascade will **never** invoke a Workflow automatically.

| Property | Value |
|----------|-------|
| **Location** | `.windsurf/workflows/*.md` (workspace) or `~/.codeium/windsurf/global_workflows/*.md` (global) |
| **Format** | Plain Markdown (no frontmatter required) |
| **Invocation** | Manual only via `/workflow-name` slash command in Cascade |
| **Limit** | 12,000 characters per file |
| **Chaining** | Workflows can call other workflows (e.g., `/workflow-1` can invoke `/workflow-2`) |

### Example Workflow: `pr-review.md`

```markdown
# PR Review Workflow

1. Get the open PR list: `gh pr list`

2. For each PR, do the following:
   a. Check out the branch: `gh pr checkout [id]`
   b. Review the diff: `gh pr diff [id]`
   c. Check CI status: `gh pr checks [id]`
   d. Summarize: print "(index). PR #[id] — [title] — Status: [ci-status]"

3. After reviewing all PRs, provide a prioritized list for review.
```

Invoke with: `/pr-review` in Cascade.

---

## Capabilities Summary

| Feature | Supported | Notes |
|---------|-----------|-------|
| Global instructions | ✅ | `~/.codeium/windsurf/memories/global_rules.md` via Settings UI |
| Project rules | ✅ | `.windsurf/rules/*.md` with frontmatter and activation modes |
| Nested/directory rules | ✅ | Rules in subdirectories discovered automatically |
| Glob-scoped rules | ✅ | `trigger: glob` with `globs:` pattern in frontmatter |
| `AGENTS.md` standard | ✅ | Natively supported; root = always-on, subdirectory = auto-glob |
| Nested `AGENTS.md` | ✅ | Full multi-level directory scoping supported |
| Memories (auto) | ✅ | Cascade auto-generates; stored locally, not version-controlled |
| Skills | ✅ | `.windsurf/skills/<name>/SKILL.md`; agentskills.io compatible |
| Workflows (slash commands) | ✅ | `.windsurf/workflows/*.md`; manual via `/workflow-name` |
| `@file` imports in rules | ❌ | Rules are standalone files; no cross-file `@import` syntax |
| Subagents | ❌ | Single-agent model (multiple simultaneous Cascades are independent) |
| Hooks / event triggers | ❌ | No file-watcher or event-based rule activation |
| Enterprise system rules | ✅ | OS-level deployment for IT-managed orgs |

---

## Sources

- [Memories & Rules](https://docs.windsurf.com/windsurf/cascade/memories) — Rules system, activation modes, global rules
- [AGENTS.md](https://docs.windsurf.com/windsurf/cascade/agents-md) — Location-scoped instructions
- [Skills](https://docs.windsurf.com/windsurf/cascade/skills) — Multi-step procedures with supporting files
- [Workflows](https://docs.windsurf.com/windsurf/cascade/workflows) — Reusable slash-command task templates
- [Cascade Overview](https://docs.windsurf.com/windsurf/cascade) — Core agent capabilities
- [Getting Started](https://docs.windsurf.com/windsurf/getting-started) — Installation and onboarding
- [Rule Templates Directory](https://windsurf.com/editor/directory) — Community rule templates curated by Windsurf team
- [agentskills.io](https://agentskills.io) — Cross-agent Skills specification

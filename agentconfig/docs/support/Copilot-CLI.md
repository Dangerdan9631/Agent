# GitHub Copilot CLI (`gh copilot`) — Directive Files Documentation

> Researched from official documentation, April 2026.
> Source: [docs.github.com/en/copilot/reference/custom-instructions-support#copilot-cli](https://docs.github.com/en/copilot/reference/custom-instructions-support#copilot-cli)

---

## Overview

**GitHub Copilot CLI** is the `gh copilot` command, provided as an extension to the **GitHub CLI** (`gh`). It brings Copilot's coding agent capabilities to the terminal, allowing AI-assisted coding and shell command suggestions outside of an IDE.

Unlike the VS Code extension (which has additional UI-driven settings), the CLI reads directive files directly from the repository on disk.

---

## Installation

Copilot CLI requires the GitHub CLI to be installed first, then the Copilot extension:

```bash
# Install GitHub CLI (if not already installed)
# macOS
brew install gh

# Windows (winget)
winget install --id GitHub.cli

# Linux — see https://cli.github.com/manual/installation

# Install the Copilot CLI extension
gh extension install github/gh-copilot

# Authenticate
gh auth login

# Verify installation
gh copilot --version
```

### Usage

```bash
# Ask a question or delegate a coding task
gh copilot suggest "refactor the auth module to use JWT"

# Get help with a shell command
gh copilot explain "git rebase -i HEAD~3"
```

---

## Directive File Structure

Copilot CLI reads three types of directive files from the repository:

```
<project>/
├── .github/
│   ├── copilot-instructions.md          # Repository-wide instructions (always applied)
│   └── instructions/
│       ├── typescript.instructions.md   # Path-specific instructions (applied by glob)
│       ├── python.instructions.md
│       └── *.instructions.md            # Any number of path-scoped files
└── AGENTS.md                            # Root agent instructions (supported)
```

> **Note:** Nested `AGENTS.md` files (in subdirectories) are **not** mentioned in the Copilot CLI documentation and are not supported.

---

## Repository-wide Instructions

| Property | Value |
|----------|-------|
| **File** | `.github/copilot-instructions.md` |
| **Scope** | All Copilot CLI requests in the repository |
| **Format** | Plain Markdown — no frontmatter required |
| **Loaded** | Always, automatically |

This file provides baseline instructions that apply to every interaction. Use it for project-wide conventions, technology stack information, coding standards, and constraints.

### Example: `.github/copilot-instructions.md`

```markdown
# Project Instructions

## Stack
- Backend: Node.js 20 with TypeScript
- Database: PostgreSQL 15 via Prisma ORM
- Frontend: React 18 with Vite

## Coding Standards
- Use `async`/`await` — no raw Promise chains
- All public functions must have JSDoc comments
- Prefer named exports over default exports
- Use `const` by default; `let` only when reassignment is required

## Testing
- Test framework: Vitest
- Place test files alongside source files as `*.test.ts`
- Aim for at least 80% coverage on new modules

## Conventions
- Branch naming: `feat/<ticket>-short-description`
- Commit messages follow Conventional Commits
- All database migrations must be reversible
```

---

## Path-specific Instructions

| Property | Value |
|----------|-------|
| **Files** | `.github/instructions/**/*.instructions.md` |
| **Scope** | Files matching the `applyTo:` glob pattern in frontmatter |
| **Format** | Markdown with YAML frontmatter |
| **Loaded** | Automatically when the relevant files are in scope |

Path-specific instruction files allow you to give Copilot targeted guidance that only applies when working with particular file types or directories. Each file must include an `applyTo:` field in its YAML frontmatter.

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `applyTo` | Yes | Glob pattern (or comma-separated list) matching the files this instruction applies to |
| `description` | No | Human-readable description of what this instruction file covers |

### Example: `.github/instructions/typescript.instructions.md`

```markdown
---
applyTo: "**/*.ts,**/*.tsx"
description: "TypeScript coding standards"
---

## TypeScript Guidelines

- Enable `strict` mode in `tsconfig.json`; no `any` without explicit justification
- Use `unknown` instead of `any` for values of truly unknown type
- Prefer `interface` over `type` for object shapes that may be extended
- Use `type` for union types, intersections, and mapped types
- Always annotate function return types explicitly
- Use `readonly` for arrays and object properties that should not be mutated

## Imports
- Use path aliases defined in `tsconfig.json` (e.g. `@/components/...`)
- Group imports: external packages, then internal aliases, then relative paths
- No circular imports; use the `eslint-plugin-import` rule to enforce this
```

### Example: `.github/instructions/python.instructions.md`

```markdown
---
applyTo: "**/*.py"
description: "Python coding standards"
---

## Python Guidelines

- Target Python 3.11+
- Use type hints on all function signatures (PEP 484)
- Format with `black`; lint with `ruff`
- Use `pathlib.Path` instead of `os.path` string manipulation
- Prefer dataclasses or Pydantic models over plain dicts for structured data
- Use `logging` module — never `print()` in production code
```

### Example: `.github/instructions/tests.instructions.md`

```markdown
---
applyTo: "**/*.test.ts,**/*.spec.ts,tests/**"
description: "Testing conventions"
---

## Test File Conventions

- Use `describe` blocks to group related tests
- Each `it`/`test` block tests exactly one behavior
- Avoid implementation details in test assertions — test behavior, not internals
- Use `vi.mock()` for module-level mocks; restore mocks in `afterEach`
- Prefer `userEvent` over `fireEvent` in React Testing Library tests
- Do not use `toBeTruthy`/`toBeFalsy`; use specific matchers
```

---

## AGENTS.md Support

| Property | Value |
|----------|-------|
| **File** | `AGENTS.md` at the repository root |
| **Scope** | All Copilot CLI requests in the repository |
| **Format** | Plain Markdown |
| **Loaded** | Automatically |
| **Nested AGENTS.md** | Not supported |

The root `AGENTS.md` file is supported by Copilot CLI. It is the standard cross-tool agent instructions file, also read by tools such as Claude Code and Codex.

> **Important:** Only the root-level `AGENTS.md` is supported. Nested `AGENTS.md` files in subdirectories are **not** documented and are **not** supported by `gh copilot`.

### Example: `AGENTS.md`

```markdown
# Agent Instructions

This file contains instructions for AI coding agents working in this repository.

## Project Context
This is a multi-tenant SaaS application for project management.
The primary language is TypeScript (backend) and React (frontend).

## Key Constraints
- Never modify database migration files that have already been applied in production
- Do not change the public API contract without updating the OpenAPI spec
- Always run `pnpm test` before considering a task complete
- Security: sanitize all user inputs; use parameterized queries only

## Repository Layout
- `apps/api/` — Express + Prisma backend
- `apps/web/` — React + Vite frontend
- `packages/` — Shared libraries (monorepo)
- `infra/` — Terraform infrastructure

## Development Workflow
- Use `pnpm` (not npm or yarn)
- Run `pnpm dev` to start both backend and frontend
- Migrations: `pnpm --filter api migrate:dev`
```

---

## Capabilities Summary

| Capability | Supported | Notes |
|------------|-----------|-------|
| **Repository-wide instructions** | ✅ | `.github/copilot-instructions.md` — always loaded |
| **Path-specific instructions** | ✅ | `.github/instructions/**/*.instructions.md` with `applyTo:` frontmatter |
| **Root `AGENTS.md`** | ✅ | `AGENTS.md` at the repository root |
| **Nested `AGENTS.md`** | ❌ | Not documented; not supported |
| **Global/personal instructions** | ❌ | No user-home instruction file |
| **Organization instructions** | ❌ | Not available in CLI context |
| **`@file` imports** | ❌ | No import/include syntax in instruction files |
| **Skills / subagents** | ❌ | No native skill or subagent support |
| **Hooks** | ❌ | No lifecycle hook system |
| `AGENTS.md` standard | ✅ root only | Only root-level `AGENTS.md` supported; nested not documented |
| `agentskills.io` standard | ❌ | No skills system |

---

## Comparison: Copilot CLI vs. Copilot in VS Code

| Feature | Copilot CLI (`gh copilot`) | Copilot in VS Code |
|---------|----------------------------|--------------------|
| `.github/copilot-instructions.md` | ✅ | ✅ |
| `.github/instructions/**/*.instructions.md` | ✅ | ✅ |
| Root `AGENTS.md` | ✅ | ✅ |
| Nested `AGENTS.md` | ❌ | ⚠️ Off by default (opt-in) |
| Personal instructions (GitHub profile) | ❌ | ⚠️ GitHub.com only |
| Organization instructions | ❌ | ❌ (IDE extension) |
| Prompt files (`.github/prompts/`) | ❌ | ⚠️ Preview feature |
| Hooks | ❌ | ❌ |

---

## Sources

- [Custom instructions support — Copilot CLI section](https://docs.github.com/en/copilot/reference/custom-instructions-support#copilot-cli)
- [Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [About customizing GitHub Copilot responses](https://docs.github.com/en/copilot/concepts/prompting/response-customization)
- [GitHub CLI documentation](https://cli.github.com/manual/)

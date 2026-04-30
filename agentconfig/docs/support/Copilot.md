# GitHub Copilot (VS Code) — Coding Agent Directive Files

> Documentation for GitHub Copilot in VS Code (IDE extension).
> **Tool**: GitHub Copilot in VS Code — [github.com/features/copilot](https://github.com/features/copilot)

---

## Overview

GitHub Copilot in VS Code supports several types of instruction files that shape how Copilot Chat and the cloud agent behave within a repository. Instructions are layered — multiple files can be active simultaneously, and all relevant sets are provided to the model.

**Instruction priority (highest → lowest):**
1. Personal instructions (GitHub.com profile — not available in VS Code extension)
2. Repository instructions (`.github/copilot-instructions.md`)
3. Organization instructions (not available in VS Code extension)

---

## File Structure

```
<project>/
├── .github/
│   ├── copilot-instructions.md          # Repository-wide instructions
│   ├── instructions/
│   │   └── *.instructions.md            # Path-specific instructions
│   └── prompts/
│       └── *.prompt.md                  # Reusable prompt files (preview)
├── AGENTS.md                            # Root agent instructions (supported)
└── subdir/
    └── AGENTS.md                        # Nested (off by default)
```

---

## Global / Personal Instructions

Personal instructions are set on your GitHub.com profile and apply to every conversation you have on the GitHub website.

**Not available in the VS Code extension.** Personal instructions only affect Copilot Chat at github.com.

**Not available in the VS Code extension:**
- Personal instructions (GitHub.com profile only)
- Organization instructions

To set personal instructions on GitHub.com:
1. Open [Copilot Chat](https://github.com/copilot) on GitHub.com
2. In the bottom-left corner, click your profile picture → **Personal instructions**
3. Add natural language instructions and click **Save**

Example personal instructions:
```
Always respond in Spanish.
Use a helpful, collegial tone. Keep explanations brief.
Always provide examples in TypeScript.
```

---

## Repository-wide Instructions

| Property | Value |
|----------|-------|
| **File** | `.github/copilot-instructions.md` |
| **Frontmatter** | Not required |
| **Scope** | All Copilot requests in the repository |
| **Supported by** | Copilot Chat, Copilot cloud agent, Copilot code review (VS Code) |

Instructions apply as soon as the file is saved. When Copilot Chat uses these instructions, the file appears as a reference at the top of the response.

### Example: `.github/copilot-instructions.md`

```markdown
We use TypeScript with strict mode enabled. All new code must include type annotations.

Testing framework: Jest with React Testing Library for components.
Run tests with: npm test

Code style:
- Use named exports over default exports
- Prefer async/await over raw Promises
- Max line length: 100 characters

When suggesting database queries, use the repository's ORM (TypeORM) rather than raw SQL.
```

> **Tip**: Whitespace between instructions is ignored. Write as a single paragraph, one per line, or separated by blank lines — whichever is most readable.

---

## Path-specific Instructions

| Property | Value |
|----------|-------|
| **Files** | `.github/instructions/**/*.instructions.md` |
| **Frontmatter** | Required — must include `applyTo:` glob |
| **Scope** | Files matching the `applyTo:` glob pattern |
| **Supported by** | Copilot Chat, Copilot cloud agent (VS Code) |

When a path-specific instructions file matches a file Copilot is working on, and a repository-wide instructions file also exists, instructions from **both** files are used.

The `excludeAgent` frontmatter key can limit which agent uses the file — valid values are `"code-review"` and `"cloud-agent"`.

### Frontmatter: `applyTo` glob patterns

| Pattern | Matches |
|---------|---------|
| `*` | All files in the current directory |
| `**` or `**/*` | All files in all directories |
| `*.py` | All `.py` files in the current directory |
| `**/*.py` | All `.py` files recursively |
| `src/*.py` | `.py` files directly in `src/` (not nested) |
| `src/**/*.py` | All `.py` files recursively in `src/` |
| `**/*.ts,**/*.tsx` | Multiple patterns — comma-separated |

### Example: `.github/instructions/typescript.instructions.md`

```markdown
---
applyTo: "**/*.ts,**/*.tsx"
---

All TypeScript files must use strict null checks.
Avoid `any` — use `unknown` and narrow the type explicitly.
Prefer interface over type alias for object shapes.
Use `const` assertions where appropriate.
```

### Example: `.github/instructions/tests.instructions.md`

```markdown
---
applyTo: "**/*.test.ts,**/*.spec.ts"
---

Use Jest with `describe`/`it` blocks.
Each test file must have at least one `describe` block.
Mock external dependencies using `jest.mock()`.
Use `beforeEach` to reset mocks: `jest.clearAllMocks()`.
```

### Example: `.github/instructions/cloud-agent-only.instructions.md`

```markdown
---
applyTo: "**"
excludeAgent: "code-review"
---

When generating pull requests, always include a summary of changes in the PR description.
Reference the relevant issue number if one exists.
```

### Example: `.github/instructions/code-review-only.instructions.md`

```markdown
---
applyTo: "**"
excludeAgent: "cloud-agent"
---

Flag any function longer than 50 lines as a candidate for refactoring.
Check for missing error handling in async functions.
```

---

## AGENTS.md Support

`AGENTS.md` files provide agent-specific instructions and are part of the cross-tool [AGENTS.md standard](https://github.com/agentsmd/agents.md).

| File | Status | Notes |
|------|--------|-------|
| Root `AGENTS.md` | ✅ Supported | Loaded by Copilot Chat and cloud agent in VS Code |
| Nested `AGENTS.md` | ⚠️ Off by default | Must be enabled via VS Code setting |
| `CLAUDE.md` | ✅ Supported | Cloud agent only (not Copilot Chat in VS Code) |
| `GEMINI.md` | ✅ Supported | Cloud agent only (not Copilot Chat in VS Code) |

### Enabling Nested AGENTS.md

To enable nested `AGENTS.md` files in VS Code, add to your `settings.json`:

```json
{
  "github.copilot.chat.agentsMd.enabled": true
}
```

When multiple `AGENTS.md` files exist, the **nearest file** in the directory tree takes precedence.

### Example: `AGENTS.md`

```markdown
# Project Agent Instructions

This is a Node.js/TypeScript monorepo using pnpm workspaces.

## Build
- Install dependencies: `pnpm install`
- Build all packages: `pnpm build`
- Run tests: `pnpm test`
- Lint: `pnpm lint`

## Structure
- `packages/api` — Express REST API
- `packages/web` — React frontend (Vite)
- `packages/shared` — Shared types and utilities

## Conventions
- All packages export a `src/index.ts` entry point
- Use conventional commits for commit messages
- Do not modify `pnpm-lock.yaml` manually
```

---

## Prompt Files (Preview)

Prompt files are reusable prompt snippets, distinct from instruction files. They are designed to be invoked explicitly, not automatically applied.

| Property | Value |
|----------|-------|
| **Files** | `.github/prompts/*.prompt.md` |
| **Status** | Preview feature |
| **File references** | Supports `#file:path` syntax to include file contents |
| **Not the same as** | Instruction files — these are not auto-applied |

### Example: `.github/prompts/create-component.prompt.md`

```markdown
Create a new React component named `{ComponentName}`.

Follow the patterns in #file:src/components/Button.tsx

Requirements:
- Use TypeScript with explicit prop types
- Export a named interface for props
- Include a default export for the component
- Add a JSDoc comment describing the component's purpose
```

---

## Skills

| Feature | Support |
|---------|--------|
| Skills | ✅ Supported |
| Subagents | ❌ Not supported |

GitHub Copilot supports agent skills following the [agentskills.io](https://agentskills.io) open standard.

### Skill Directories

| Path | Scope |
|------|-------|
| `.github/skills/<skill-name>/` | Project |
| `.claude/skills/<skill-name>/` | Project (cross-tool compat) |
| `.agents/skills/<skill-name>/` | Project (cross-tool compat) |
| `~/.copilot/skills/<skill-name>/` | User global |
| `~/.claude/skills/<skill-name>/` | User global (cross-tool compat) |
| `~/.agents/skills/<skill-name>/` | User global (cross-tool compat) |

Each skill is a directory containing a `SKILL.md` file. The agent automatically invokes skills based on the prompt and the skill's `description`. Skills can also include scripts and other resources that the agent can act on.

### `SKILL.md` Frontmatter

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier; lowercase, hyphens only; must match the directory name |
| `description` | Yes | What the skill does and when Copilot should use it |
| `allowed-tools` | No | Pre-approve tools (e.g. `shell`, `bash`) to skip confirmation prompts |
| `license` | No | License description or reference |

> **Warning**: Only pre-approve `shell` or `bash` in `allowed-tools` if you have reviewed the skill and fully trust its source. Pre-approval skips terminal command confirmation.

### Managing Skills with GitHub CLI

Use `gh skill` (GitHub CLI 2.90+) to discover, install, update, and publish skills:

```sh
gh skill search TOPIC
gh skill preview OWNER/REPOSITORY SKILL
gh skill install OWNER/REPOSITORY SKILL
gh skill update --all
gh skill publish
```

By default, skills are installed for Copilot at project scope. Use `--scope user` for global install and `--agent` to target a specific agent host.

- **Sources**: [docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)

---

## Hooks

| Feature | Status |
|---------|--------|
| Lifecycle hooks | ❌ Not supported |

GitHub Copilot has no lifecycle hook system. There are no pre/post tool use callbacks, session start/end hooks, or similar event-driven mechanisms.

---

## VS Code Settings

The following VS Code settings control Copilot instruction behavior:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `github.copilot.chat.codeGeneration.useInstructionFiles` | boolean | `true` | Whether to use `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` files |
| `github.copilot.chat.agentsMd.enabled` | boolean | `false` | Whether to load nested `AGENTS.md` files in subdirectories |

### Disabling instruction files

To disable all instruction files globally in VS Code:

```json
{
  "github.copilot.chat.codeGeneration.useInstructionFiles": false
}
```

To disable or re-enable custom instructions for **Copilot code review** on GitHub.com:
- Navigate to the repository → **Settings** → **Copilot** → **Code review**
- Toggle "Use custom instructions when reviewing pull requests"

> **Note**: For code review, Copilot uses instructions from the **base branch** of the pull request (e.g., `main`), not the feature branch.

---

## Capabilities Summary

| Capability | Copilot Chat (VS Code) | Copilot Cloud Agent (VS Code) | Copilot Code Review (VS Code) |
|------------|----------------------|------------------------------|-------------------------------|
| Personal instructions | ❌ | ❌ | ❌ |
| Organization instructions | ❌ | ❌ | ❌ |
| `.github/copilot-instructions.md` | ✅ | ✅ | ✅ |
| `.github/instructions/*.instructions.md` | ✅ | ✅ | ❌ |
| Root `AGENTS.md` | ✅ | ✅ | ❌ |
| Nested `AGENTS.md` | ⚠️ Off by default | ✅ | ❌ |
| `CLAUDE.md` / `GEMINI.md` | ❌ | ✅ | ❌ |
| `.github/prompts/*.prompt.md` | ✅ (preview) | ✅ (preview) | ❌ |
| Skills | ✅ | ✅ | ❌ |
| Subagents | ❌ | ❌ | ❌ |
| Hooks | ❌ | ❌ | ❌ |
| `AGENTS.md` standard | ✅ root, ⚠️ nested off by default | Root `AGENTS.md` supported; nested requires `github.copilot.chat.agentsMd.enabled` opt-in |
| `agentskills.io` standard | ❌ | ✅ `.github/skills/`, `.agents/skills/` | ❌ |

---

## Sources

- [Support for different types of custom instructions](https://docs.github.com/en/copilot/reference/custom-instructions-support)
- [Adding repository custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- [Adding personal custom instructions for GitHub Copilot](https://docs.github.com/en/copilot/customizing-copilot/adding-personal-custom-instructions-for-github-copilot)
- [GitHub Copilot features](https://github.com/features/copilot)
- [agentsmd/agents.md](https://github.com/agentsmd/agents.md)

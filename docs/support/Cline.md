# Cline (VS Code Extension) — Directive Files & Customization System

**Cline** is an open-source AI coding agent that runs inside VS Code (and other editors). It can read and write files, run terminal commands, use a browser, and work through complex tasks with your explicit approval at every step.

- **Official site:** [cline.bot](https://cline.bot)
- **Documentation:** [docs.cline.bot](https://docs.cline.bot)
- **Source:** [github.com/cline/cline](https://github.com/cline/cline) (open source, Apache 2.0)
- **Marketplace:** Search "Cline" in VS Code Extensions (`Ctrl+Shift+X`)

---

## Overview

Cline offers five customization systems that work together:

| System | Purpose | When Active |
|--------|---------|-------------|
| **Rules** | Persistent coding standards and project constraints | Always (or conditionally by path) |
| **Skills** | Domain expertise loaded on demand | When request matches skill description |
| **Workflows** | Step-by-step task scripts | Invoked via `/workflow-name.md` |
| **Hooks** | Programmatic guardrails and automation | Automatically on specific lifecycle events |
| **.clineignore** | File access control | Always |

---

## File Structure

```
~/ (Global, applies to all projects)
├── Documents/Cline/Rules/        # Global rules (Windows: Documents\Cline\Rules)
├── Documents/Cline/Workflows/    # Global workflows
├── Documents/Cline/Hooks/        # Global hooks (.ps1 on Windows, extensionless on macOS/Linux)
└── .cline/skills/                # Global skills (~/.cline/skills/ on macOS/Linux)
                                  # (Windows: C:\Users\USERNAME\.cline\skills\)

<project>/
├── .clinerules/                  # Project rules directory (primary format)
│   ├── coding.md                 # Always-active rules (no frontmatter)
│   ├── testing.md                # Always-active rules
│   ├── frontend.md               # Conditional: YAML frontmatter with paths
│   ├── workflows/                # Project workflows
│   │   └── release.md
│   └── hooks/                    # Project hooks
│       └── PreToolUse            # macOS/Linux: extensionless; Windows: PreToolUse.ps1
├── .clinerules                   # Alternative: single-file rules (plain markdown)
├── .cline/
│   └── skills/                   # Project skills
│       └── my-skill/
│           └── SKILL.md
├── .clineignore                  # File access exclusions (like .gitignore)
├── memory-bank/                  # Memory Bank files (conventional location)
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   └── progress.md
├── AGENTS.md                     # Cross-tool agent instructions (officially supported)
├── .cursorrules                  # Cursor rules (auto-detected by Cline)
└── .windsurfrules                # Windsurf rules (auto-detected by Cline)
```

---

## Global Instructions

Global instructions that apply across all projects can be set in two ways:

### 1. VS Code Settings — Custom Instructions Field

Open the Cline panel and navigate to **Settings → Custom Instructions**. Text entered here applies globally to every conversation regardless of which project is open. Ideal for personal coding style preferences and communication preferences.

```
Always use TypeScript strict mode.
Prefer functional programming patterns.
Keep explanations concise. Use code examples over prose.
```

### 2. Global Rules Directory

Place `.md` or `.txt` rule files in the global Cline Rules directory:

| Platform | Path |
|----------|------|
| Windows | `Documents\Cline\Rules\` |
| macOS / Linux | `~/Documents/Cline/Rules/` |
| Linux/WSL (alt) | `~/Cline/Rules/` |

Global rules apply across all projects. When both global and workspace rules exist, workspace rules take precedence on conflicts.

---

## Project Rules (`.clinerules`)

Project rules provide persistent instructions for Cline within a specific repository. They are version-controlled alongside the code.

### Single File vs. Directory

Cline accepts rules in either form:

**Option A — Single file** (`.clinerules` in project root):

```markdown
# Project Guidelines

## Code Style
- Use TypeScript for all new files
- camelCase for variables, PascalCase for classes, UPPER_SNAKE for constants
- Prefer composition over inheritance

## Testing
- Unit tests required for all business logic
- Use Jest with React Testing Library for components
```

**Option B — Directory** (`.clinerules/` in project root, recommended):

```
<project>/
└── .clinerules/
    ├── coding.md          # Code style standards
    ├── testing.md         # Test requirements
    ├── architecture.md    # Structural decisions
    └── frontend.md        # Conditional: path-scoped rule
```

Cline processes all `.md` and `.txt` files inside `.clinerules/`, combining them into a unified rule set. Numeric prefixes (e.g., `01-coding.md`) are optional but help organize files.

### Always-Active Rules (No Frontmatter)

A rule file with no YAML frontmatter is always active — it loads for every request:

```markdown
# Coding Standards

## Style
- Use TypeScript for all new files
- Prefer composition over inheritance
- Use repository pattern for data access
- Follow error handling pattern in /src/utils/errors.ts

## Documentation
- Update relevant docs when modifying features
- Keep README.md in sync with new capabilities

## Testing
- Unit tests required for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
```

### Conditional Rules (YAML Frontmatter, Path-Scoped)

Rules can be scoped to activate only when specific file paths are in context. Add YAML frontmatter with a `paths` array of glob patterns:

```markdown
---
paths:
  - "src/components/**"
  - "src/hooks/**"
---

# React Component Guidelines

When creating or modifying React components:
- Use functional components with React hooks
- Extract reusable logic into custom hooks
- Keep components focused on a single responsibility
- Use Tailwind CSS for styling
```

Cline evaluates conditional rules based on:
- File paths mentioned in your message
- Files currently open in the editor
- Files Cline has created, modified, or deleted during the task

**Practical pattern — separate frontend/backend rules:**

```markdown
# .clinerules/frontend.md
---
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/hooks/**"
---

# Frontend Guidelines
- Use Tailwind CSS for styling
- Prefer server components where possible
```

```markdown
# .clinerules/backend.md
---
paths:
  - "src/api/**"
  - "src/services/**"
  - "src/db/**"
---

# Backend Guidelines
- Use dependency injection for services
- All database queries go through repositories
- Return typed errors, not thrown exceptions
```

### Creating Rules via UI

1. Click the **scale icon** at the bottom of the Cline panel
2. Click **"New rule file…"** and enter a filename (e.g., `coding-standards`)
3. The file is created with a `.md` extension in `.clinerules/`

You can also use the `/newrule` slash command to have Cline create a rule interactively.

### Rule Toggling

Every rule file has an on/off toggle in the Rules panel. Toggling a rule off disables it entirely — it won't load even if its path conditions match.

---

## Memory Bank

Cline's **Memory Bank** is a documentation methodology that gives Cline persistent project context across sessions. Because LLM context resets between conversations, Memory Bank stores project knowledge in structured markdown files that Cline reads at the start of each task.

### Memory Bank File Structure

```
<project>/
└── memory-bank/
    ├── projectbrief.md      # Foundation: core requirements and goals
    ├── productContext.md    # Why the project exists, UX goals
    ├── activeContext.md     # Current focus, recent changes, next steps
    ├── systemPatterns.md    # Architecture, design patterns, component relationships
    ├── techContext.md       # Tech stack, setup, constraints, dependencies
    └── progress.md          # What works, what's left, known issues
```

### Core Files

| File | Role | Update Frequency |
|------|------|-----------------|
| `projectbrief.md` | Foundation document; defines scope and goals | Rarely |
| `productContext.md` | Why the project exists, problems it solves | Rarely |
| `systemPatterns.md` | Architecture decisions and design patterns | When architecture changes |
| `techContext.md` | Tech stack, dependencies, dev setup | When stack changes |
| `activeContext.md` | Current work focus, next steps | Every session |
| `progress.md` | Milestones, known issues, status | After significant changes |

### Setup

1. Copy the Memory Bank custom instructions (see below) into either:
   - Cline's **Custom Instructions** field in Settings (global), or
   - A `.clinerules` file in your project (project-scoped)
2. Ask Cline: **"initialize memory bank"**
3. Cline creates the `memory-bank/` directory and initial files

### Key Commands

| Command | Effect |
|---------|--------|
| `initialize memory bank` | Creates the initial `memory-bank/` structure |
| `follow your custom instructions` | Tells Cline to read the Memory Bank and continue |
| `update memory bank` | Triggers full review and update of all Memory Bank files |

### Memory Bank Custom Instructions

Add this to your `.clinerules` file or Cline's Custom Instructions setting:

```markdown
# Cline's Memory Bank

I am Cline, an expert software engineer with a unique characteristic: my memory resets
completely between sessions. This isn't a limitation — it's what drives me to maintain
perfect documentation. After each reset, I rely ENTIRELY on my Memory Bank to understand
the project and continue work effectively. I MUST read ALL memory bank files at the start
of EVERY task — this is not optional.

## Memory Bank Structure

Files build upon each other in a clear hierarchy:

### Core Files (Required)
1. `projectbrief.md` — Foundation document; core requirements and goals
2. `productContext.md` — Why this project exists; problems it solves; UX goals
3. `activeContext.md` — Current work focus; recent changes; next steps
4. `systemPatterns.md` — System architecture; design patterns; component relationships
5. `techContext.md` — Technologies used; development setup; dependencies
6. `progress.md` — What works; what's left; current status; known issues

### Additional Context
Create additional files/folders within memory-bank/ when needed for:
- Complex feature documentation
- Integration specifications
- API documentation
- Testing strategies

## Documentation Updates

Memory Bank updates occur when:
1. Discovering new project patterns
2. After implementing significant changes
3. When user requests "update memory bank" (MUST review ALL files)
4. When context needs clarification
```

### Context Window Management

When the context window fills up:
1. Ask Cline to **"update memory bank"** to capture the current state
2. Start a new conversation
3. Ask Cline to **"follow your custom instructions"**

Or use Cline's built-in commands:
- `/smol` — Compresses conversation history while staying in the same task
- `/newtask` — Distills key decisions and progress into a fresh task

---

## Supported Rule File Types

Cline auto-detects rule files from multiple tools for cross-tool compatibility:

| Format | File / Location | Notes |
|--------|----------------|-------|
| Cline Rules | `.clinerules/` | Primary format; `.md` and `.txt` files |
| Cursor Rules | `.cursorrules` | Auto-detected |
| Windsurf Rules | `.windsurfrules` | Auto-detected |
| AGENTS.md | `AGENTS.md` (project root) | Officially supported; cross-tool standard |

All detected rule files appear in Cline's Rules panel and can be toggled individually.

---

## Skills

Cline has a built-in **Skills** system (experimental feature — enable via **Settings → Features → Enable Skills**). Skills are modular instruction sets that load on demand, unlike rules which always load.

Skills are **not** the same as the [agentskills.io](https://agentskills.io) community standard. Cline uses its own native skills format.

### Skill Structure

Each skill is a directory with a `SKILL.md` file containing YAML frontmatter:

```
.cline/skills/
└── data-analysis/
    ├── SKILL.md          # Required: name, description, instructions
    ├── docs/             # Optional: detailed documentation
    └── scripts/          # Optional: executable scripts
```

```markdown
# .cline/skills/data-analysis/SKILL.md
---
name: data-analysis
description: Analyze data files and generate insights. Use when working with CSV,
  Excel, or JSON data files that need exploration, cleaning, or visualization.
---

# Data Analysis

When analyzing data files:
1. Read a sample to understand structure
2. Identify data quality issues
3. Ask clarifying questions before diving in
4. Use pandas for data manipulation
```

### Skills Storage Locations

| Scope | Location |
|-------|----------|
| Project (recommended) | `.cline/skills/` |
| Project (alt) | `.clinerules/skills/` or `.claude/skills/` |
| Global (macOS/Linux) | `~/.cline/skills/` |
| Global (Windows) | `C:\Users\USERNAME\.cline\skills\` |

When a global skill and project skill share the same name, the global skill takes precedence.

---

## Hooks

Cline supports **Hooks** — executable scripts that run at key lifecycle moments. Hooks bring determinism to AI workflows by enforcing guardrails and automating actions.

### Hook Types

| Hook | Trigger |
|------|---------|
| `TaskStart` | When a new task begins |
| `TaskResume` | When an interrupted task resumes |
| `TaskCancel` | When a task is cancelled |
| `TaskComplete` | When a task finishes successfully |
| `PreToolUse` | Before any tool executes (most powerful for validation) |
| `PostToolUse` | After a tool completes |
| `UserPromptSubmit` | When you send a message |
| `PreCompact` | Before conversation history is compressed |

### Hook Storage

| Scope | Location |
|-------|----------|
| Global | `~/Documents/Cline/Hooks/` |
| Project | `.clinerules/hooks/` |

When both global and project hooks exist for the same type, both run (global first). If either returns `cancel: true`, the operation stops.

**Platform naming:**
- **macOS / Linux:** Extensionless file (e.g., `PreToolUse`) — must be executable (`chmod +x`)
- **Windows:** PowerShell file (e.g., `PreToolUse.ps1`)

### Example: Block `.js` Files in a TypeScript Project

```bash
#!/bin/bash
# .clinerules/hooks/PreToolUse  (macOS/Linux)

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.preToolUse.tool')
FILE_PATH=$(echo "$INPUT" | jq -r '.preToolUse.parameters.path // empty')

if [[ "$TOOL" == "write_to_file" && "$FILE_PATH" == *.js ]]; then
  echo '{"cancel":true,"errorMessage":"Use .ts files instead of .js in this TypeScript project"}'
  exit 0
fi

echo '{"cancel":false}'
```

### Hook I/O

Hooks receive JSON via **stdin** and return JSON via **stdout**:

```json
// Input (example: PreToolUse)
{
  "taskId": "abc123",
  "hookName": "PreToolUse",
  "clineVersion": "3.17.0",
  "workspaceRoots": ["/path/to/project"],
  "preToolUse": {
    "tool": "write_to_file",
    "parameters": { "path": "src/config.ts", "content": "..." }
  }
}

// Output
{
  "cancel": false,
  "contextModification": "Optional text injected into conversation",
  "errorMessage": ""
}
```

---

## Workflows

Workflows are step-by-step task scripts stored as markdown files. Invoke them via slash command: `/release.md`, `/setup.md`, etc.

| Scope | Location |
|-------|----------|
| Project | `.clinerules/workflows/` |
| Global | `~/Documents/Cline/Workflows/` |

```markdown
# .clinerules/workflows/release.md

## Release Workflow

1. Run the test suite: `npm test`
2. Update version in package.json
3. Update CHANGELOG.md with changes since last release
4. Commit with message: `chore: release vX.Y.Z`
5. Create git tag: `git tag vX.Y.Z`
6. Push with tags: `git push --follow-tags`
```

---

## .clineignore

`.clineignore` controls which files and directories Cline can access. Works like `.gitignore`. Place it in the project root.

```gitignore
node_modules/
dist/
.env
*.log
coverage/
.next/
```

Adding `.clineignore` early is recommended — it can reduce Cline's starting context from 200k+ tokens to under 50k.

---

## AGENTS.md

Cline **officially supports** `AGENTS.md` in the project root as a cross-tool agent instructions file. It appears in the Rules panel alongside `.clinerules` files and can be toggled independently.

```markdown
# AGENTS.md

This repository uses TypeScript with strict mode. All new files must be `.ts` or `.tsx`.

## Testing
Run tests with: `npm test`
Tests live in `src/__tests__/` following the `*.test.ts` naming convention.
```

> **Note:** `AGENTS.md` in subdirectories is not mentioned in Cline's documentation — only the project root is officially detected.

---

## Subagents

Cline does not have a native subagent or multi-agent framework. There is no built-in mechanism to spawn parallel Cline instances. However, you can instruct Cline via rules or prompts to decompose tasks and work through them sequentially.

---

## Capabilities Summary

| Feature | Supported | Notes |
|---------|-----------|-------|
| Global instructions (VS Code settings) | ✅ | Custom Instructions field in Cline settings |
| Global rules directory | ✅ | `~/Documents/Cline/Rules/` |
| Project rules — single file | ✅ | `.clinerules` (plain markdown) |
| Project rules — directory | ✅ | `.clinerules/` with `.md`/`.txt` files |
| Conditional / path-scoped rules | ✅ | YAML frontmatter with `paths` globs |
| Rule toggling (per-file on/off) | ✅ | Via Rules panel in Cline UI |
| `AGENTS.md` | ✅ | Officially supported; cross-tool standard |
| `.cursorrules` / `.windsurfrules` | ✅ | Auto-detected for cross-tool compatibility |
| Nested instructions (subdirectory) | ❌ | Only project root `.clinerules/` is scanned |
| `@file` imports | ❌ | Not supported in rule files |
| Memory Bank | ✅ | Via custom instructions + `memory-bank/` directory |
| Skills (Cline-native) | ✅ (experimental) | `.cline/skills/` — enable in Settings |
| Skills (agentskills.io standard) | ❌ | Not supported |
| Workflows | ✅ | `.clinerules/workflows/` or global |
| Hooks | ✅ | `.clinerules/hooks/` or global; 8 hook types |
| Subagents | ❌ | No native multi-agent framework |
| `.clineignore` | ✅ | File access control (like `.gitignore`) |

---

## Sources

- [Cline Documentation](https://docs.cline.bot) — Official docs home
- [Customization Overview](https://docs.cline.bot/customization/overview) — Rules, Skills, Workflows, Hooks, .clineignore
- [Cline Rules](https://docs.cline.bot/customization/cline-rules) — Full rules reference including conditional rules
- [Memory Bank](https://docs.cline.bot/features/memory-bank) — Memory Bank feature and custom instructions
- [Skills](https://docs.cline.bot/customization/skills) — Native Cline skills system
- [Hooks](https://docs.cline.bot/customization/hooks) — Hook types, lifecycle, examples
- [Quick Start](https://docs.cline.bot/getting-started/quick-start) — Installation and setup
- [Cline GitHub Repository](https://github.com/cline/cline)

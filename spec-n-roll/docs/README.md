# Spec-n-Roll Documentation

Toolkit-authored documentation for spec-n-roll. These Markdown files live in the spec-n-roll repository root only and are not installed into user projects by `init` or `update`.

Reading `docs/` alone should be enough to understand the full workflow and extension mechanism (SC-008) without consulting source files.

## Documentation policy

- Document **implemented behavior only** at each phase checkpoint.
- Use explicit `TODO:` markers for planned but not-yet-implemented functionality.
- Reading `docs/` to understand current shipped behavior is **required** for phase review — docs are the review surface, not an afterthought.

## Guide map

| File | What you learn |
|------|----------------|
| [`workflow.md`](workflow.md) | Slash commands (`/spec-n-specify`, `/spec-n-roll`, plan/tasks/analyze/implement), embedded triage, lifecycle (Active→Complete→Locked), living specs, and TDD red→green→refactor |
| [`cli.md`](cli.md) | Three binaries, dispatcher exec model, `init` / `update` / `config add-agent` / `version`, `--yes` and `--global`, core-library subcommands, MCP server tools |
| [`multi-agent.md`](multi-agent.md) | Bundled agents (Cursor, Claude Code, Copilot, Codex), MCP config merge, canonical rules, adding agents later |
| [`platform-scripts.md`](platform-scripts.md) | Paired `.sh` / `.ps1` install and runtime auto-selection |
| [`updates-and-migrations.md`](updates-and-migrations.md) | Toolkit vs user file ownership, `.bak` backups, schema migration at update time, compatibility warnings |
| [`extension-quickstart.md`](extension-quickstart.md) | Register an extension, replace a built-in step, add hooks |
| [`extension-reference.md`](extension-reference.md) | Manifest fields, step priority, hook validation, handler contract |
| [`extension-example.md`](extension-example.md) | End-to-end custom triage walkthrough |

## Typical developer journey

1. **Setup** — `spec-n-roll init` (see `cli.md`, `multi-agent.md`)
2. **Specify** — `/spec-n-specify <description>` with embedded triage (see `workflow.md`)
3. **Advance** — `/spec-n-roll` through tier steps (see `workflow.md`)
4. **Implement** — `/spec-n-implement` updates living specs first, then TDD (see `workflow.md`)
5. **Maintain toolkit** — `spec-n-roll update` with safe ownership rules (see `updates-and-migrations.md`)
6. **Extend** — optional custom steps and hooks (see `extension-quickstart.md`)

Phase 13 validates these guides against `specs/001-spec-n-roll-toolkit/quickstart.md` scenarios 1–12 via `tests/integration/quickstart-scenarios.test.ts`.

# Spec-n-Roll Documentation

Toolkit-authored documentation for spec-n-roll. These Markdown files live in the Spec-N-Roll repository root only and are not installed into user projects by `init` or `update`.

Reading `docs/` alone should be enough to understand the full workflow and extension mechanism (SC-008) without consulting source files.

## Documentation policy

- Document **implemented behavior only** at each phase checkpoint.
- Use explicit `TODO:` markers for planned but not-yet-implemented functionality.
- Reading `docs/` to understand current shipped behavior is **required** for phase review — docs are the review surface, not an afterthought.

## Guide map

| File                                                     | What you learn                                                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`workflow.md`](workflow.md)                             | Slash commands, set list triage, step init/finalize boundaries, Spec Manifestos, task-spec lifecycle (Active→Complete→Locked), living specs, and TDD red→green→refactor |
| [`cli.md`](cli.md)                                       | Binaries, dispatcher, `init` / `update` / `config agent`, `step init`/`finalize`, `set-list`, `manifesto show`, MCP tools, Ink navigation                               |
| [`multi-agent.md`](multi-agent.md)                       | Bundled agents (Cursor, Claude Code, Copilot, Codex), MCP config merge, canonical rules, adding agents later                                                            |
| [`platform-scripts.md`](platform-scripts.md)             | Paired `.sh` / `.ps1` install and runtime auto-selection                                                                                                                |
| [`updates-and-migrations.md`](updates-and-migrations.md) | Toolkit vs user file ownership, `.bak` backups, schema migration at update time, compatibility warnings                                                                 |
| [`extension-quickstart.md`](extension-quickstart.md)     | Register an extension, replace a built-in step, add hooks                                                                                                               |
| [`extension-reference.md`](extension-reference.md)       | Manifest fields, step priority, hook validation, handler contract                                                                                                       |
| [`extension-example.md`](extension-example.md)           | End-to-end custom triage walkthrough                                                                                                                                    |

## Typical developer journey

1. **Setup** — `spec-n-roll init` seeds workflows, set lists, and manifesto paths (see `cli.md`, `multi-agent.md`)
2. **Govern** — optional `/spec-n-manifesto` for global and step-scoped agent rules (see `workflow.md`)
3. **Specify** — `/spec-n-specify <description>` with set list triage (see `workflow.md`)
4. **Advance** — `/spec-n-roll` through workflow steps; agents call `step_init` / `step_finalize` at each step boundary (see `workflow.md`)
5. **Implement** — `/spec-n-implement` updates living specs first, then TDD (see `workflow.md`)
6. **Maintain toolkit** — `spec-n-roll update` with safe ownership rules and set-list migration (see `updates-and-migrations.md`)
7. **Extend** — optional custom steps, hooks, and set lists (see `extension-quickstart.md`)

Phase 13 validates these guides against `specs/001-spec-n-roll-toolkit/quickstart.md` scenarios 1–12 via `tests/integration/quickstart-scenarios.test.ts`.

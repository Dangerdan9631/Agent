# Spec-n-Roll Documentation

Toolkit-authored documentation for spec-n-roll. These Markdown files live in the spec-n-roll repository root only and are not installed into user projects by `init` or `update`.

## Documentation policy

- Document **implemented behavior only** at each phase checkpoint.
- Use explicit `TODO:` markers for planned but not-yet-implemented functionality.
- Reading `docs/` to understand current shipped behavior is **required** for phase review — docs are the review surface, not an afterthought.

Guides are updated incrementally as phases complete:

| File | Primary phase |
|------|----------------|
| `cli.md` | Setup (Phase 1), Foundational (Phase 2), US1, US9 |
| `updates-and-migrations.md` | Foundational (Phase 2), US9, US10 |
| `multi-agent.md` | US1 |
| `platform-scripts.md` | US2 |
| `workflow.md` | US3–US7 (specify, roll, lifecycle, living specs, TDD) |
| `extension-quickstart.md`, `extension-reference.md`, `extension-example.md` | US8 |

Phase 13 runs a final review (`tasks.md` T133) and quickstart validation (T134).

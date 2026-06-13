# CLI Ink

Interactive terminal UI built with Ink and React. This layer contains the reusable prompt modules already used by init, update, agent configuration, and recovery flows, plus the application shell planned for bare `spec-n-roll` execution.

The `app/` directory owns session state, routing, and global key handling. `screens/` contains the task spec, workflow, agent, project, and setup views that present toolkit behavior without duplicating mutation logic. `read-models/` assembles read-only summaries from project files for those screens, while `components/` holds shared terminal UI primitives.

Existing prompt modules in this directory remain the source for interactive init, update, and agent-selection experiences. New screens should compose those prompts or existing command orchestrators instead of forking equivalent behavior.

# CLI Ink

Interactive terminal UI built with Ink and React. This layer contains the reusable prompt modules already used by init, update, agent configuration, and recovery flows, plus the application shell planned for bare `spec-n-roll` execution.

The interactive app uses a two-level layout model. App scaffolding in `app/` reserves fixed status bar and key hint overlay regions and assigns all remaining terminal rows to a route content slot. Route screens in `screens/` own that slot interior: list and menu routes compose a content area plus selection list via `RouteContentLayout` in `components/`, while form and detail routes fill the slot directly. `read-models/` assembles read-only summaries from project files for those screens.

The `app/` directory owns session state, routing, and global key handling. `screens/` contains the task spec, workflow, agent, project, and setup views that present toolkit behavior without duplicating mutation logic. `components/` holds shared terminal UI primitives, including scaffolding and route content layout allocators.

Existing prompt modules in this directory remain the source for interactive init, update, and agent-selection experiences. New screens should compose those prompts or existing command orchestrators instead of forking equivalent behavior.

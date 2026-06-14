# Specs

Workflow step handlers for specification-driven task creation and advancement. This layer orchestrates set list triage, interviews, planning, task breakdown, and implementation entry without owning deterministic file mutations.

Triage delegates to `src/setlists/triage.ts` using enabled set lists from project configuration. Step handlers invoke the core library for template instantiation, lifecycle transitions, and workflow state updates while agents edit prose bodies directly and call `step_init` / `step_finalize` at step boundaries.

# Repository Workflows

Repository onboarding and drift workflows for already-initialized Spec-n-Roll projects. This layer discovers bounded repository evidence from code, tests, documentation, and living specs, compares that evidence against existing living-spec coverage, and prepares specify-stage injection and durable run reports without mutating `living-specs/` or tests during specify.

Discovery planning (`discovery-plan.ts`), evidence normalization (`evidence.ts`), drift categorization (`drift.ts` and `drift-helpers.ts`), report rendering (`report.ts`), and workflow execution (`workflow-run.ts`) live here so core behavior can be tested independently of CLI, MCP, and Ink adapters. Workflow runs stop after specify; plan, tasks, and implement remain downstream maintainer work.

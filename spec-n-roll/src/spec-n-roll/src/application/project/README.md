# Dispatcher project domain - src/spec-n-roll/src/application/project

This directory contains project-root resolution behavior for dispatcher requests. It owns project-context decisions that are independent of runtime execution.

## Conventions

### Project resolution

Keep path resolution behavior explicit and based on API contracts. Avoid mixing runtime target or process launch decisions into project-root classes.

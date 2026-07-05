# Living Specs

Gherkin living specification utilities for behavior-driven development. This layer parses, routes, tags, and scaffolds `.feature` files under `living-specs/` as the executable source of truth for Cucumber tests, generates stub step definitions for unmapped steps, and runs Cucumber against living specs during implement.

Living spec files are agent-managed and outside the MCP/CLI mutation boundary. The toolkit provides parsing and scaffolding helpers only.

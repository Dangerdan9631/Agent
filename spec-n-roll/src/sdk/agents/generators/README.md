# Agent Generators

Per-agent extension generators for coding agents. This layer emits rules pointers, workflow skills (including `spec-n-manifesto`), and MCP configuration fragments from each agent's extension manifest during init and add-agent flows.

`workflow-skills.ts` builds managed skill frontmatter with author and toolkit version metadata and encodes step init/finalize MCP instructions for executable workflow steps.

Generators stay idempotent so repeated toolkit operations refresh agent setup without disturbing unrelated agent configuration.

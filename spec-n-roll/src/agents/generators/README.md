# Agent Generators

Per-agent extension generators for bundled coding agents. This layer emits rules pointers, skills, and MCP configuration fragments from each agent's extension manifest during init and add-agent flows.

Generators stay idempotent so repeated toolkit operations refresh agent setup without disturbing unrelated agent configuration.

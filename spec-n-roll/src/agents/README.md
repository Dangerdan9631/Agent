# Agents

Bundled agent extension generators and MCP configuration merge logic. This layer produces per-agent rules pointers, skills, and project-local MCP server entries during init, add-agent, and update flows.

Each agent declares MCP config targets and merge rules in its extension manifest. Generators keep agent setup idempotent across repeated toolkit operations.

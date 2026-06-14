# Agents

Bundled agent extension generators and MCP configuration merge logic. This layer produces per-agent rules pointers, workflow skills, and project-local MCP server entries during init, add-agent, and update flows.

Each agent declares MCP config targets and merge rules in its extension manifest. Generators keep agent setup idempotent across repeated toolkit operations. Managed workflow skills include `metadata.author: spec-n-roll` and `metadata.version` from the installed toolkit; refresh is limited to the managed skill manifest so user-authored skills are preserved.

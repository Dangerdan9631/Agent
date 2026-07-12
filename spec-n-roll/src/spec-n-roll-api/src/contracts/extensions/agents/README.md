# Agent extension contracts

This directory contains contracts specific to agent extensions. They describe how an agent receives ordered skill content and configures its own MCP integration.

## Conventions

### Agent-neutral design

Keep these interfaces independent of any specific agent's native file formats or configuration paths. Agent-specific implementations belong outside the API package.

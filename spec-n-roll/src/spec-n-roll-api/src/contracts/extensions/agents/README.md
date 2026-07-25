# Agent extension contracts

This directory contains contracts specific to agent extensions. They describe how an agent translates neutral skill definitions and configures its own MCP integration.

## Conventions

### Agent-neutral design

Keep these interfaces independent of any specific agent's native file formats or configuration paths. Neutral capability definitions belong in the skill contracts; agent-specific implementations belong outside the API package.

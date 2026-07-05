# SDK application layer - src/spec-n-roll-sdk/src/application

This directory contains reusable business behavior shared by executable packages. Domains should stay independent of dispatcher, runtime, MCP, and CLI transports.

## Conventions

### Transport independence

Keep abstractions and behavior in this layer free of process and framework dependencies. Inject collaborators instead of constructing adapters here.

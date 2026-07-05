# SDK logging domain - src/spec-n-roll-sdk/src/infrastructure/logging

This directory contains logger factory infrastructure for SDK diagnostics. It owns concrete tslog logger construction for the SDK package.

## Conventions

### Logging construction

Keep logger creation centralized and narrow. Do not construct ad hoc loggers inside SDK business behavior.

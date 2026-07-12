# Extension infrastructure

This directory contains infrastructure adapters for extension-specific storage. It translates project filesystem configuration into runtime extension contracts without loading extension modules.

## Conventions

### Passive discovery

Keep adapters limited to locating and validating extension registration data. Importing or invoking extension modules belongs to a future activation capability.

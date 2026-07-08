# Architecture HTTP infrastructure domain - src/spec-n-roll-arch/src/infrastructure/http

This directory contains local HTTP adapters for architecture artifact workflows. It serves generated diagram files and owns the write boundary for checked-in layout artifacts, diagram-driven root config updates, and timestamped image exports.

## Conventions

### Local serving

Keep request parsing, path safety, content types, and filesystem persistence in this layer. Do not add graph conversion, dependency analysis, or package policy decisions here.

# Architecture artifacts domain - src/spec-n-roll-arch/src/application/artifacts

This directory contains application behavior for generating architecture artifacts. It coordinates graph, package, and configuration collaborators to produce output models.

## Conventions

### Artifact generation

Keep generation workflows here while delegating writes and external analysis to injected collaborators. Avoid embedding renderer or dependency-cruiser details in orchestration classes.

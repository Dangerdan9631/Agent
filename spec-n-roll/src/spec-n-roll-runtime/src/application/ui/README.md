# Runtime UI application domain

This directory contains UI-neutral contracts and policies for selecting an interactive experience and allocating terminal regions. Presentation and process adapters depend on these types without placing Ink concerns in application behavior.

## Conventions

### Layout policy

Keep row allocation deterministic and independent of React. Fixed chrome and minimum-size policy are centralized here so every routed screen receives one authoritative content budget.

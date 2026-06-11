# Config

Shared configuration contracts for spec-n-roll. This layer defines the shape and validation rules for persisted project settings so readers and writers agree on identifiers, versions, and structure.

Zod schemas and reusable identifier patterns (kebab-case IDs, semver, task spec IDs, agent command names) live here. Workflow configuration—agents, step registry, tier variants, and extension references—is modeled as typed, strict documents with schema versions for future migration.

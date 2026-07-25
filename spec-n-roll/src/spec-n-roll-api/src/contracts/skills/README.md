# Neutral skill contracts

This directory defines capabilities independently of coding-agent file formats. Definitions carry stable identity, intent, versioned input and output shapes, instruction source, and external capability requirements so workflows can reference them without depending on a selected agent.

## Conventions

### Agent extension boundary

Keep native paths, frontmatter, invocation syntax, and vendor configuration outside these contracts. Agent extensions translate definitions and resolve declared requirements for their own environment.

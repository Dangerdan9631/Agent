# Extension application domain

This directory defines runtime-facing extension discovery boundaries and bundled extension source models. It models configuration discovery only; loading and invoking extension modules remains outside the current runtime behavior.

## Conventions

### Deferred activation

Discovery may read registration state but must not import, instantiate, or execute extension modules. Keep future extension activation behind a separate application capability, while bundled module text remains isolated in the agent subdomain.

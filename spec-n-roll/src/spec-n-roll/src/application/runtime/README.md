# Dispatcher runtime domain - src/spec-n-roll/src/application/runtime

This directory contains runtime target selection and execution boundaries for dispatcher requests. It models what runtime should be invoked without coupling callers to Node child-process details.

## Conventions

### Runtime boundaries

Represent executable runtime work through interfaces in this domain. Concrete process launch classes belong in infrastructure.

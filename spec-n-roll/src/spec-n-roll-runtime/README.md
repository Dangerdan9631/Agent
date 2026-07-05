# spec-n-roll-runtime

This package owns the child-process runtime executable. It is designed for dispatcher invocation while remaining installable beside project-local tooling.

The current runtime implementation is a stub that reads a `RuntimeInvocation` JSON payload from stdin, validates the dispatcher boundary shape, and prints the parsed data to stdout. Future command behavior should continue to receive dispatcher context through the API package contract.

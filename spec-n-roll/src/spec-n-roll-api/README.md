# spec-n-roll-api

This package owns the strict interface across dispatcher and runtime boundaries. Version-sensitive paths, argument contracts, install-source metadata, and shared project detection/path-resolution types belong here.

Runtime processes receive `RuntimeInvocation` as JSON over stdin. Keep this package free of dispatcher and runtime implementation details so globally installed dispatchers and project-local runtimes can share the same boundary vocabulary.

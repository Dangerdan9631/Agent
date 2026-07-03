# Dispatcher

## What it is

The dispatcher is a thin routing layer when a user invokes `spec-n-roll` or `snr`. It never implements workflow behavior itself, it is the first code that runs and it only decides which runtime should handle the invocation and then hands off to it.

## Why it exists

Projects pin a specific toolkit version locally so that workflow behavior doesn't silently drift when a newer global version is installed elsewhere. The dispatcher is what makes that pinning transparent to the user: running the command inside a project with a local install delegates there automatically, while running it anywhere else falls back to whatever is installed globally.

## How dispatch works

1. Decide whether the invocation should be interactive or a specific, non-interactive command.
2. Look for a project-local install, searching upward from the current directory so the command works from any subdirectory of a project.
3. If a usable local install exists, delegate to it. Otherwise, fall back to the global CLI or interactive UI, and honor an explicit override for callers who always want the global runtime.
4. Exit with whatever code the delegated runtime returned, so the dispatcher behaves as a transparent passthrough for scripts and automation.

## Local install health

Because a local install is a set of files staged onto disk, it can become stale or damaged over time. Before delegating to it, the dispatcher checks that the install looks complete and compatible, and refuses to run it otherwise. Commands that are meant to repair or replace an install are allowed through even when validation would normally fail, so a broken install doesn't lock a project out of fixing itself. Any other validation failure reports an actionable next step rather than silently falling back to the global runtime, since silently switching runtimes could mask the version pinning the local install exists to provide.

## Delegated context

When handing off to a local install, the dispatcher passes along contextual information about the dispatch itself, such as which runtime made the decision and where its resources live. Downstream code uses this to tell whether it is running standalone or via delegation, and to resolve its own package boundaries correctly either way.

## Boundaries

The dispatcher should stay small and route only to the CLI, Ink, or local launcher entry points. Business behavior and project file operations belong in `src/sdk/`, while dependency registration belongs in `src/di/`. If a change here needs to reach into workflow logic or file mutation, that logic belongs elsewhere and should be called into, not inlined.

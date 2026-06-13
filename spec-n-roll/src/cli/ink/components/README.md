# Ink Components

Shared Ink components provide reusable terminal UI primitives for selectable lists, numbered choices, recoverable errors, confirmations, key hints, persistent status display, read-only context content, and selection-region row reporting.

These components own rendering, focus, row allocation, and local keyboard concerns only. They should remain free of project reads and writes so screens can compose them with read models and command orchestrators without hiding side effects inside UI primitives.

The context content primitives define the shared shape for focused option metadata, vertical scrolling with a scrollbar, and the pure fullscreen row allocation used by the shell. Selectable lists and screens report how many terminal rows the selection region requires so the shell never shrinks that area below its content. Selectable lists may report focus changes with that metadata, but activation remains separate and belongs only to explicit selection input.

# Ink Components

Shared Ink components provide reusable terminal UI primitives for selectable lists, numbered choices, recoverable errors, confirmations, quit confirmation, key hints, persistent status display, read-only context content, selection-region row reporting, and route-owned layout composition.

These components own rendering, focus, row allocation, and local keyboard concerns only. They should remain free of project reads and writes so screens can compose them with read models and command orchestrators without hiding side effects inside UI primitives.

The context content primitives define the shared shape for focused option metadata, vertical scrolling with a scrollbar, and pure row allocation helpers for both app scaffolding and route content layout. App scaffolding allocation reserves fixed status and key hint chrome, then assigns all remaining rows to the route content slot. Route content layout allocation subtracts reported selection rows and assigns the remainder to the upper content sub-region.

`RouteContentLayout` composes the reusable content-plus-selection pattern inside the route slot. Selectable lists report how many terminal rows the selection sub-region requires so route layouts never shrink that area below its content. Selectable lists may report focus changes with read-only metadata, but activation remains separate and belongs only to explicit selection input.

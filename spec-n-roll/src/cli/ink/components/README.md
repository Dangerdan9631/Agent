# Ink Components

Shared Ink components provide reusable terminal UI primitives for selectable lists, numbered choices, recoverable errors, confirmations, key hints, and persistent status display.

These components own rendering, focus, and local keyboard concerns only. They should remain free of project reads and writes so screens can compose them with read models and command orchestrators without hiding side effects inside UI primitives.

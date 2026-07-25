# Ink presentation

This directory contains the interactive React and Ink shell, route layouts, home installation context, navigation, routed commands, keyboard menus, and stdout resize hook.

## Conventions

### Region ownership

The application scaffold owns the title, route-layout slot, and hint regions. Routes select an action or console layout and provide only the content required by that layout while honoring its row budget. Layout slots clip overflowing content so title and hint chrome remains fixed.

### Keyboard input

Shell-level navigation and exit behavior remain in the shell. The action layout delegates selection to its menu, and the console layout owns page-scroll input.

### Routed commands

Command routes execute application-provided callbacks when loaded. The initialization route is the exception: it lets users toggle built-in agents before running its command. Home pages show the dispatcher, selected runtime, working directory, and discovered project root; the global home exposes initialization and disables it when the configured root already contains a project. Completed global updates reload only when Escape returns from the update route.

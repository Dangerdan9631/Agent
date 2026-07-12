# Ink presentation

This directory contains the interactive React and Ink shell, navigation, routed commands, keyboard menus, scrolling viewport, and stdout resize hook.

## Conventions

### Region ownership

The application shell owns status, route, and hint regions. Routed screens own only the interior of the route content slot and must honor its row budget.

### Keyboard input

Shell-level navigation and exit behavior remain in the shell. Screen components own menu selection and content scrolling inputs.

### Routed commands

Command routes execute application-provided callbacks when loaded. The global home exposes initialization first and disables it when the configured root already contains a project.

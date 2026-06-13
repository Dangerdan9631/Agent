# CLI Ink

Interactive terminal UI components built with Ink and React. This layer hosts multi-select prompts, confirmation dialogs, and management flows that require user input during init, update, and recovery scenarios.

Ink prompts for agent selection during interactive `init`. Pass `--agents` on `init` to skip prompts. Subcommands other than `init` run non-interactively without Ink.

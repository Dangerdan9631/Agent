# CLI Commands

Commander subcommand classes for non-interactive toolkit management. Each command is an `@injectable()` class implementing `CliCommand` with a single `register(command)` method that wires argv parsing and output to the SDK.

Group commands compose subcommands via tsyringe `@injectAll` injection. Registration is centralized in `register-cli-commands.ts` and invoked from the DI composition root.

Interactive Ink flows delegate to modules under `src/ink/` while deterministic writes route through the SDK.

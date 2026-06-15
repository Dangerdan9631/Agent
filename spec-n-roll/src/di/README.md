# Dependency injection

tsyringe composition root for spec-n-roll. Executable entry points import `bootstrap.ts` before other application code so `reflect-metadata` and service registration run once at startup.

Register services in `registerApplicationServices()` inside `container.ts`. CLI command classes are registered in `cli/commands/register-cli-commands.ts` against tokens declared in `tokens.ts`. Top-level and nested commands use `@injectAll(Token)` for composition.

Resolve dependencies through `rootContainer` or constructor injection on `@injectable()` classes. Use explicit `@inject(Token)` on constructor parameters when a single token is required.

In tests, call `resetApplicationContainer()` in `beforeEach` to clear registrations between cases.

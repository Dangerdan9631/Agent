# Contract: Dispatcher Delegation (Amendment)

Amends the Global Dispatcher section of `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md` for feature 006. **Resolution algorithm and paths are unchanged**; local binary semantics change from external-root wrappers to self-contained bundles.

## Unchanged Behavior

1. `--global` → exec global full CLI relative to dispatcher install path.
2. Walk parent directories from `cwd` for `.spec-n-roll/cli/bin/spec-n-roll`.
3. Local found → exec as child process; MUST NOT load full CLI/core/MCP in dispatcher process.
4. No local → exec global full CLI.
5. Forward `-v`/`--version` unchanged to resolved target.
6. MCP always targets `.spec-n-roll/cli/bin/spec-n-roll-mcp`.

## Added: Pre-Spawn Integrity Check

After local binary path resolved and before `spawnSync`:

1. Run install integrity validation against `{projectRoot}/.spec-n-roll/cli`.
2. If invalid (missing bundle files, legacy layout, unknown `layoutVersion`):
   - Exit non-zero with actionable message.
   - MUST NOT fall back to global unless `--global` was passed.
   - **Exception**: Skip validation when the delegated command is `update`, `init`, `remove`, or bare interactive invocation (no subcommand) so repair and migration can run.

**Example error (legacy layout)**:

```text
Local Spec-N-Roll install uses a deprecated layout. Run `spec-n-roll update` in this project to refresh the local runtime.
```

**Example error (missing bundle)**:

```text
Local Spec-N-Roll install is incomplete (missing .spec-n-roll/cli/dist/cli/index.js). Run `spec-n-roll update` or `spec-n-roll init` to repair.
```

## Version Skew

The dispatcher does NOT compare its version to the local install version. Delegation succeeds when spawn succeeds. Version skew is visible in the full CLI version report after handoff.

Supported expectation (SC-003): local install up to two minor versions behind and one minor ahead of dispatcher package version delegates and runs successfully when sharing the same major version.

Cross-major local bundles MAY run but are not a compatibility guarantee; failures MUST surface from the local process with upgrade guidance.

## Environment Forwarding

When delegating to local CLI launcher:

- Forward caller environment unchanged except existing `SPEC_N_ROLL_DISPATCHED=1` convention when applicable.
- Local launcher sets `SPEC_N_ROLL_LOCAL_PIN=1` on the bundled full CLI child.

## Acceptance Tests

| Scenario | Expected |
|----------|----------|
| Local self-contained install, no flags | Delegates; version report `invocation: local` |
| Local install missing `dist/cli/index.js` | Dispatcher error; no global fallback |
| `--global` with local present | Global full CLI; `invocation: global` |
| No local install | Global full CLI |
| Local v1.0.0, dispatcher v1.2.0 | Delegates; executed report shows 1.0.0 |
| Legacy `toolkitPackageRoot` install | Integrity error for normal commands; `update` delegates so migration can run |

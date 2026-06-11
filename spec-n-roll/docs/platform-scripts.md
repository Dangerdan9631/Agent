# Platform Scripts

Automation scripts for spec-n-roll are installed as paired `.sh` (Unix-like) and `.ps1` (Windows) files. The toolkit selects the correct variant at runtime — there is no per-project configuration, `scriptVariants` field, or `config script-variants` command.

This document reflects **Phase 4 (US2)** shipped behavior.

## Install location

During `spec-n-roll init`, bundled script pairs are copied to:

```text
.spec-n-roll/scripts/
├── check-prerequisites.sh
└── check-prerequisites.ps1
```

Implementation: `installBundledPlatformScripts` in `src/workflow/platform-scripts.ts`, invoked from `src/cli/commands/init.ts`.

Both forms are always installed. Developers do not choose script variants during init or in `workflow.config.json`.

## Runtime auto-selection

When the workflow engine runs an automation script, it:

1. Detects the current platform (`win32` → Windows/PowerShell, otherwise Unix/bash).
2. Resolves the matching script under `.spec-n-roll/scripts/` (`.ps1` or `.sh`).
3. Verifies the required shell runtime is available.
4. Spawns only the platform-appropriate script — never the opposite variant.

Implementation:

- Selection and execution: `src/workflow/platform-scripts.ts`
- Workflow entry point: `runAutomationScript` in `src/workflow/engine.ts`

| Platform family | Script extension | Shell runtime |
| --------------- | ---------------- | ------------- |
| Windows (`win32`) | `.ps1` | `pwsh` (preferred) or `powershell` |
| Unix-like (`darwin`, `linux`, …) | `.sh` | `/bin/bash` or `bash` on PATH |

## Missing shell runtime

If the required runtime is not available, script execution fails with `PlatformScriptError` (`SHELL_RUNTIME_MISSING`) and remediation text:

- **Windows**: Install PowerShell 7+ from https://aka.ms/powershell or ensure Windows PowerShell is on PATH.
- **Unix-like**: Install bash and ensure `/bin/bash` or `bash` on PATH.

TODO: Expand remediation with distro-specific package manager examples and detection of constrained CI images where bash is not in the default PATH.

## Bundled scripts (v0.1.0)

| Script base name | Purpose |
| ---------------- | ------- |
| `check-prerequisites` | Placeholder prerequisites check returning JSON status (expanded in later workflow phases) |

Source pairs live in `src/scripts/` in the toolkit repository and are copied to `dist/scripts/` during `npm run build`.

## TODO (not yet implemented)

- Additional automation script pairs beyond `check-prerequisites` (e.g. plan/tasks setup helpers referenced by agent skills in later phases).
- Script installation refresh during `spec-n-roll update` (US9).
- Workflow step handlers that invoke scripts as part of `/spec-n-roll` advancement (US4+).

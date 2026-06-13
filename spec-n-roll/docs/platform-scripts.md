# Platform Scripts

Spec-N-Roll installs paired automation scripts into each initialized project under `.spec-n-roll/scripts/`. Every script has both a `.sh` variant for Unix-like systems and a `.ps1` variant for Windows.

Runtime execution uses platform auto-selection. Windows selects the `.ps1` script, while macOS and Linux select the `.sh` script for the same logical operation, so projects do not need a script variant setting in `workflow.config.json`.

The platform selector validates that the selected script exists before execution. When the required runtime is missing, command execution fails with a clear message identifying the missing shell runtime and the selected script path.

The installed scripts are toolkit-owned files. `spec-n-roll update` may refresh them, preserving changed toolkit-owned files with `.bak` backups according to the normal ownership and migration rules.

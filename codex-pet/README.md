# Commander Drone

This directory is the maintainable source package for the Commander Drone Codex pet.

## Layout

- `robot-cutout.png` — original source artwork.
- `source/` — final individual PNG frames for the nine standard animation rows and all 16 look directions.
- `output/` — the two files installed by Codex: `pet.json` and `spritesheet.webp`.
- `build.ps1` — rebuilds the atlas from `source/` using the installed hatch-pet assembly scripts.
- `install.ps1` — copies the contents of `output/` into `%USERPROFILE%\.codex\pets\commander-drone`.

## Modify and rebuild

Edit or replace complete frame PNGs under `source/<state>/` while preserving the expected frame counts: idle 6, running-right 8, running-left 8, waving/power-up 4, jumping 5, failed 8, waiting 6, running 6, review 6. Direction frames live in `source/look-directions/` and use their degree filenames.

Run `powershell -ExecutionPolicy Bypass -File .\build.ps1`, then inspect `output/spritesheet.webp`. Run `powershell -ExecutionPolicy Bypass -File .\install.ps1` to install the rebuilt pet. Restart Codex or reselect the pet after installation.

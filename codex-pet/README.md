# Commander

This directory is the maintainable source package for the Commander Codex pet.

## Layout

- `robot-cutout.png` — original source artwork.
- `source/` — composite PNG frames for the nine standard animation rows and all 16 look directions. Each animation folder includes matching `robot/` and `drone/` visible-layer frames plus a `combine.json` composition definition.
- `combine-images.py` — rebuilds combined PNG frames from the animation-local JSON definitions.
- `output/` — the two files installed by Codex: `pet.json` and `spritesheet.webp`.
- `build.ps1` — rebuilds the atlas from `source/` using the installed hatch-pet assembly scripts.
- `install.ps1` — copies the contents of `output/` into `%USERPROFILE%\.codex\pets\commander`.
- `preview/` — dependency-free browser app that previews the robot, drone, and combined layers side by side.
- `run-preview.ps1` — opens the preview app in the default browser.

## Preview animations

From this directory, run:

```powershell
.\run-preview.ps1
```

The page opens in your default browser and shows every animation state (including look directions) in a looping grid. Each state presents robot, drone, and combined frames side by side. Use the frame-rate selector or pause button to inspect timing. It reads the PNGs directly from `source/`, so no build or install step is needed. You can also open `preview\index.html` directly in a browser.

## Modify and rebuild

Edit or replace complete frame PNGs under `source/<state>/` while preserving the expected frame counts: idle 6, running-right 8, running-left 8, waving/power-up 4, jumping 5, failed 8, waiting 6, running 6, review 6. Direction frames live in `source/look-directions/` and use their degree filenames.

When changing isolated robot or drone artwork, rebuild the matching combined frames first:

```powershell
& 'C:\Users\dangr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\combine-images.py
```

Use `--animation <state>` to rebuild one state and `--check` to validate every configuration without replacing PNGs. Compositing is deliberately separate from `build.ps1`, which only assembles already-combined frames into the pet atlas.

## Composition configuration

Each animation folder owns a `combine.json`. `layerOrder` is painted back-to-front, and each named layer points at its frame template. Transforms retain the original `192x208` registration: they scale around an anchor, rotate, translate, adjust opacity, then composite. Coordinates are pixels; positive rotation and path angles are clockwise in screen coordinates.

```json
{
  "version": 1,
  "canvas": [192, 208],
  "frames": ["00", "01"],
  "layerOrder": ["drone", "robot"],
  "layers": {
    "drone": {
      "source": "drone/{frame}.png",
      "transform": {
        "anchor": "content-center",
        "position": {"type": "linear", "start": [-8, 0], "end": [8, 0], "easing": "ease-in-out"},
        "rotation": {"type": "keyframes", "keyframes": [{"frame": "00", "value": 0}, {"frame": "01", "value": 12}]}
      },
      "frameOverrides": {"01": {"opacity": 0.8}}
    },
    "robot": {"source": "robot/{frame}.png"}
  }
}
```

`position`, `scale`, `rotation`, and `opacity` accept constants, a `frames` map, `linear` start/end values, or keyed values with `linear`, `ease-in`, `ease-out`, `ease-in-out`, and `step` easing. `position` additionally supports `ellipse` (`center`, `radii`, `startAngle`, `endAngle`) and circular `arc` (`center`, `radius`, `startAngle`, `endAngle`). `frameOverrides` wins over the base transform for its named frame. `anchor` may be `content-center`, `canvas-center`, or an `[x, y]` coordinate; nearest-neighbor resampling is the default for pixel art.

Run `powershell -ExecutionPolicy Bypass -File .\build.ps1`, then inspect `output/spritesheet.webp`. Run `powershell -ExecutionPolicy Bypass -File .\install.ps1` to install the rebuilt pet. Restart Codex or reselect the pet after installation.

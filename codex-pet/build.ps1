$ErrorActionPreference = 'Stop'
$python = 'C:\Users\dangr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$skill = 'C:\Users\dangr\.codex\skills\hatch-pet\scripts'
$temp = Join-Path ([System.IO.Path]::GetTempPath()) 'commander-pet-build'
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $temp | Out-Null
& $python "$skill\compose_atlas.py" --frames-root "$PSScriptRoot\source" --output "$temp\standard.png" --webp-output "$temp\standard.webp"
& $python "$skill\assemble_extended_atlas.py" --base-atlas "$temp\standard.webp" --look-cells-dir "$PSScriptRoot\source\look-directions" --neutral-cell "$PSScriptRoot\source\idle\00.png" --chroma-key '#FF00FF' --output "$temp\spritesheet.png" --webp-output "$temp\spritesheet.webp"
& $python "$skill\despill_chroma_edges.py" "$temp\spritesheet.png" --output "$temp\spritesheet.png" --webp-output "$temp\spritesheet.webp" --chroma-key '#FF00FF'
# Commander deliberately uses a magenta rim light; keep the fringe check below
# that distinct rim shade while still rejecting pixels close to the #FF00FF key.
& $python "$skill\validate_atlas.py" "$temp\spritesheet.webp" --chroma-key '#FF00FF' --chroma-fringe-threshold 80 --require-v2
if ($LASTEXITCODE -ne 0) { throw 'Spritesheet validation failed.' }
Copy-Item "$temp\spritesheet.webp" "$PSScriptRoot\output\spritesheet.webp" -Force
Remove-Item $temp -Recurse -Force

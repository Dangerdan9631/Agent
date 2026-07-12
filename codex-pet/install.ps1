$ErrorActionPreference = 'Stop'
$destination = Join-Path $env:USERPROFILE '.codex\pets\commander-drone'
New-Item -ItemType Directory -Force $destination | Out-Null
Copy-Item "$PSScriptRoot\output\spritesheet.webp" "$destination\spritesheet.webp" -Force
Copy-Item "$PSScriptRoot\output\pet.json" "$destination\pet.json" -Force
Write-Host "Installed Commander Drone to $destination"

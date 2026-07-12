$ErrorActionPreference = 'Stop'
Start-Process (Join-Path $PSScriptRoot 'preview\index.html')

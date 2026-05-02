$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$composeFile = Join-Path $PSScriptRoot 'compose.yaml'
$envFile = Join-Path $PSScriptRoot '.env'
$networkName = 'agent-services'

function Assert-DockerAvailable {
  $null = Get-Command docker -ErrorAction Stop

  try {
    $dockerPing = docker version --format '{{.Server.Version}}' 2>$null
  } catch {
    $dockerPing = $null
  }

  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dockerPing)) {
    throw 'Docker Desktop is not running or the Docker daemon is unavailable. Start Docker Desktop, then rerun this script.'
  }
}

function Get-EnvValue {
  param(
    [string]$Key,
    [string]$DefaultValue
  )

  if (-not (Test-Path $envFile)) {
    return $DefaultValue
  }

  $line = Get-Content $envFile | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) {
    return $DefaultValue
  }

  return ($line -split '=', 2)[1]
}

function Ensure-DockerNetwork {
  $resolvedNetwork = Get-EnvValue -Key 'AGENT_DOCKER_NETWORK' -DefaultValue $networkName
  $network = docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $resolvedNetwork }
  if (-not $network) {
    Write-Host "Creating shared Docker network $resolvedNetwork..."
    docker network create $resolvedNetwork | Out-Null
  }
}

if (-not (Test-Path $envFile)) {
  $exampleFile = Join-Path $PSScriptRoot '.env.example'
  if (Test-Path $exampleFile) {
    Copy-Item $exampleFile $envFile
    Write-Host 'Created ollama/.env from .env.example'
  }
}

$ollamaNative = Get-EnvValue -Key 'OLLAMA_NATIVE' -DefaultValue 'false'
$chatModel    = Get-EnvValue -Key 'OLLAMA_CHAT_MODEL' -DefaultValue 'qwen3.5:4b'
$embedModel   = Get-EnvValue -Key 'OLLAMA_EMBED_MODEL' -DefaultValue 'nomic-embed-text'
$ollamaPort   = Get-EnvValue -Key 'OLLAMA_PORT' -DefaultValue '11434'

if ($ollamaNative -eq 'true') {
  # ── Native mode: use host Ollama via Homebrew (gets macOS Metal GPU) ─────────
  if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host 'Ollama not found. Installing via Homebrew...'
    brew install ollama
  }

  $svcStatus = brew services list 2>$null | Select-String '^ollama\s+started'
  if ($svcStatus) {
    Write-Host 'Native Ollama service already running.'
  } else {
    Write-Host 'Starting native Ollama service...'
    brew services start ollama
  }

  Write-Host 'Waiting for native Ollama to become ready...'
  $attempts = 0
  do {
    $attempts += 1
    try {
      $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$ollamaPort/" -TimeoutSec 3 -ErrorAction Stop
      if ($r.StatusCode -ge 200) { break }
    } catch {}
    if ($attempts -ge 40) { throw 'Native Ollama did not become reachable in time.' }
    Start-Sleep -Seconds 3
  } while ($true)

  Write-Host "Pulling chat model: $chatModel"
  ollama pull $chatModel
  Write-Host "Pulling embedding model: $embedModel"
  ollama pull $embedModel

  Write-Host 'Installed models:'
  ollama list
} else {
  # ── Docker mode ───────────────────────────────────────────────────────────────
  Assert-DockerAvailable
  Ensure-DockerNetwork

  Write-Host 'Starting Ollama stack...'
  docker compose -f $composeFile up -d

  Write-Host 'Waiting for Ollama container health...'
  $attempts = 0
  do {
    $attempts += 1
    try {
      $status = docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' agent-ollama
    } catch {
      $status = ''
    }
    if ($status -eq 'healthy') { break }
    if ($attempts -ge 40) { throw 'Ollama container did not become healthy in time.' }
    Start-Sleep -Seconds 3
  } while ($true)

  Write-Host 'Ensuring configured models are available...'
  docker compose -f $composeFile run --rm model-init

  Write-Host 'Installed models:'
  docker compose -f $composeFile exec ollama ollama list
}

Write-Host "Ollama is ready at http://127.0.0.1:$ollamaPort"

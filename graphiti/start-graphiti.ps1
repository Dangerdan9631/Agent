$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$composeFile = Join-Path $PSScriptRoot 'compose.yaml'
$envFile = Join-Path $PSScriptRoot '.env'
$venvDir = Join-Path $PSScriptRoot '.venv'
$pythonExe = Join-Path $venvDir 'Scripts\python.exe'
$requirementsFile = Join-Path $PSScriptRoot 'requirements.txt'
$smokeTest = Join-Path $PSScriptRoot 'quickstart_ollama_neo4j.py'
$repoRoot = Split-Path $PSScriptRoot -Parent
$ollamaScript = Join-Path $repoRoot 'ollama\start-ollama.ps1'
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

function Wait-ForHttpEndpoint {
  param(
    [string]$Url,
    [string]$Description
  )

  Write-Host "Waiting for $Description..."
  $attempts = 0
  do {
    $attempts += 1
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    } catch {
    }

    if ($attempts -ge 40) {
      throw "$Description did not become reachable in time."
    }

    Start-Sleep -Seconds 3
  } while ($true)
}

if (-not (Test-Path $envFile)) {
  $exampleFile = Join-Path $PSScriptRoot '.env.example'
  if (Test-Path $exampleFile) {
    Copy-Item $exampleFile $envFile
    Write-Host 'Created graphiti/.env from .env.example'
  }
}

if (-not (Test-Path $ollamaScript)) {
  throw 'Expected sibling ollama/start-ollama.ps1 to exist.'
}

Assert-DockerAvailable
Ensure-DockerNetwork

Write-Host 'Ensuring Ollama is running...'
& $ollamaScript

Write-Host 'Starting Graphiti network services...'
docker compose -f $composeFile up -d

$bindIp = Get-EnvValue -Key 'LAN_BIND_IP' -DefaultValue '127.0.0.1'
if ($bindIp -eq '0.0.0.0') {
  $bindIp = '127.0.0.1'
}
$neo4jHttpPort = Get-EnvValue -Key 'NEO4J_HTTP_PORT' -DefaultValue '7474'
$restPort = Get-EnvValue -Key 'GRAPHITI_REST_PORT' -DefaultValue '8000'
$mcpPort = Get-EnvValue -Key 'GRAPHITI_MCP_PORT' -DefaultValue '8001'
$wrapperPort = Get-EnvValue -Key 'GRAPHITI_WRAPPER_PORT' -DefaultValue '8002'

Wait-ForHttpEndpoint -Url "http://${bindIp}:$neo4jHttpPort" -Description 'Neo4j HTTP endpoint'
Wait-ForHttpEndpoint -Url "http://${bindIp}:$restPort/healthcheck" -Description 'Graphiti REST service'
Wait-ForHttpEndpoint -Url "http://${bindIp}:$mcpPort/health" -Description 'Graphiti MCP server'
Wait-ForHttpEndpoint -Url "http://${bindIp}:$wrapperPort/health" -Description 'Graphiti API wrapper'

if (-not (Test-Path $pythonExe)) {
  Write-Host 'Creating Graphiti virtual environment...'
  py -3 -m venv $venvDir
}

Write-Host 'Installing Graphiti dependencies...'
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r $requirementsFile

Write-Host 'Running Graphiti smoke test...'
& $pythonExe $smokeTest

Write-Host "Graphiti REST: http://${bindIp}:$restPort"
Write-Host "Graphiti MCP: http://${bindIp}:$mcpPort/mcp/"
Write-Host "Graphiti API Wrapper: http://${bindIp}:$wrapperPort"
Write-Host 'Graphiti services are running and the smoke test completed.'

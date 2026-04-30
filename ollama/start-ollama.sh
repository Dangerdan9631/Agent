#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
ENV_FILE="$SCRIPT_DIR/.env"
DEFAULT_NETWORK_NAME="agent-services"

assert_docker_available() {
  command -v docker >/dev/null 2>&1 || {
    echo "docker is not installed or not on PATH." >&2
    exit 1
  }

  if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
    echo "Docker Desktop is not running or the Docker daemon is unavailable. Start Docker Desktop, then rerun this script." >&2
    exit 1
  fi
}

get_env_value() {
  local key="$1"
  local default_value="$2"

  if [[ ! -f "$ENV_FILE" ]]; then
    printf '%s\n' "$default_value"
    return
  fi

  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 || true)"
  if [[ -z "$line" ]]; then
    printf '%s\n' "$default_value"
    return
  fi

  printf '%s\n' "${line#*=}"
}

ensure_docker_network() {
  local network_name
  network_name="$(get_env_value AGENT_DOCKER_NETWORK "$DEFAULT_NETWORK_NAME")"
  if ! docker network ls --format '{{.Name}}' | grep -Fxq "$network_name"; then
    echo "Creating shared Docker network $network_name..."
    docker network create "$network_name" >/dev/null
  fi
}

if [[ ! -f "$ENV_FILE" && -f "$SCRIPT_DIR/.env.example" ]]; then
  cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
  echo "Created ollama/.env from .env.example"
fi

assert_docker_available
ensure_docker_network

echo "Starting Ollama stack..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for Ollama container health..."
for attempt in $(seq 1 40); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' agent-ollama 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi

  if [[ "$attempt" -eq 40 ]]; then
    echo "Ollama container did not become healthy in time." >&2
    exit 1
  fi

  sleep 3
done

echo "Ensuring configured models are available..."
docker compose -f "$COMPOSE_FILE" run --rm model-init

echo "Installed models:"
docker compose -f "$COMPOSE_FILE" exec ollama ollama list

echo "Ollama is ready at http://127.0.0.1:11434"

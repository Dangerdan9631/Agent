#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
ENV_FILE="$SCRIPT_DIR/.env"
DEFAULT_NETWORK_NAME="agent-services"
NATIVE_LOG_FILE="/opt/homebrew/var/log/ollama.log"

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

tail_native_logs() {
  if [[ ! -f "$NATIVE_LOG_FILE" ]]; then
    echo "Native Ollama log file not found at $NATIVE_LOG_FILE" >&2
    return 1
  fi

  echo "Attaching to native Ollama logs at $NATIVE_LOG_FILE"
  exec tail -n 50 -f "$NATIVE_LOG_FILE"
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

ollama_native="$(get_env_value OLLAMA_NATIVE "false")"
chat_model="$(get_env_value OLLAMA_CHAT_MODEL "qwen3.5:4b")"
embed_model="$(get_env_value OLLAMA_EMBED_MODEL "nomic-embed-text")"
ollama_port="$(get_env_value OLLAMA_PORT "11434")"
ollama_tail_logs="${OLLAMA_TAIL_LOGS:-true}"

if [[ "$ollama_native" == "true" ]]; then
  # ── Native mode: use host Ollama via Homebrew (gets macOS Metal GPU) ────────
  if ! command -v ollama >/dev/null 2>&1; then
    echo "Ollama not found. Installing via Homebrew..."
    brew install ollama
  fi

  if brew services list | grep -q '^ollama.*started'; then
    echo "Native Ollama service already running."
  else
    echo "Starting native Ollama service..."
    brew services start ollama
  fi

  echo "Waiting for native Ollama to become ready..."
  for attempt in $(seq 1 40); do
    status_code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$ollama_port/" || true)"
    if [[ "$status_code" != "000" ]]; then
      break
    fi
    if [[ "$attempt" -eq 40 ]]; then
      echo "Native Ollama did not become reachable in time." >&2
      exit 1
    fi
    sleep 3
  done

  echo "Pulling chat model: $chat_model"
  ollama pull "$chat_model"
  echo "Pulling embedding model: $embed_model"
  ollama pull "$embed_model"

  echo "Installed models:"
  ollama list
else
  # ── Docker mode ──────────────────────────────────────────────────────────────
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
fi

echo "Ollama is ready at http://127.0.0.1:$ollama_port"

if [[ "$ollama_native" == "true" && "$ollama_tail_logs" == "true" ]]; then
  tail_native_logs
fi

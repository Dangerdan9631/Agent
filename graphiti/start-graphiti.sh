#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
ENV_FILE="$SCRIPT_DIR/.env"
VENV_DIR="$SCRIPT_DIR/.venv"
PYTHON_EXE="$VENV_DIR/bin/python"
REQUIREMENTS_FILE="$SCRIPT_DIR/requirements.txt"
SMOKE_TEST="$SCRIPT_DIR/quickstart_ollama_neo4j.py"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
OLLAMA_SCRIPT="$REPO_ROOT/ollama/start-ollama.sh"
OLLAMA_ENV_FILE="$REPO_ROOT/ollama/.env"
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

wait_for_http_endpoint() {
  local url="$1"
  local description="$2"

  echo "Waiting for $description..."
  for attempt in $(seq 1 40); do
    status_code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$status_code" != "000" ]]; then
      return
    fi

    if [[ "$attempt" -eq 40 ]]; then
      echo "$description did not become reachable in time." >&2
      exit 1
    fi

    sleep 3
  done
}

resolve_python() {
  local candidate
  for candidate in python3.12 python3.11 python3.10 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      local candidate_path
      candidate_path="$(command -v "$candidate")"
      local version
      version="$($candidate_path -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")' 2>/dev/null || true)"

      if [[ -n "$version" ]]; then
        local major="${version%%.*}"
        local minor="${version##*.}"
        if [[ "$major" -gt 3 || ("$major" -eq 3 && "$minor" -ge 10) ]]; then
          echo "$candidate_path"
          return
        fi
      fi
    fi
  done

  echo "Python 3.10+ is required for graphiti-core, but no compatible interpreter was found on PATH." >&2
  echo "Install Python 3.11 (recommended), then rerun this script." >&2
  exit 1
}

python_is_compatible() {
  local python_path="$1"
  local version
  version="$($python_path -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")' 2>/dev/null || true)"
  if [[ -z "$version" ]]; then
    return 1
  fi

  local major="${version%%.*}"
  local minor="${version##*.}"
  [[ "$major" -gt 3 || ("$major" -eq 3 && "$minor" -ge 10) ]]
}

if [[ ! -f "$ENV_FILE" && -f "$SCRIPT_DIR/.env.example" ]]; then
  cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
  echo "Created graphiti/.env from .env.example"
fi

[[ -f "$OLLAMA_SCRIPT" ]] || {
  echo "Expected sibling ollama/start-ollama.sh to exist." >&2
  exit 1
}

assert_docker_available
ensure_docker_network

echo "Ensuring Ollama is running..."
bash "$OLLAMA_SCRIPT"

echo "Starting Graphiti network services..."
docker compose -f "$COMPOSE_FILE" up -d

bind_ip="$(get_env_value LAN_BIND_IP 127.0.0.1)"
if [[ "$bind_ip" == "0.0.0.0" ]]; then
  bind_ip="127.0.0.1"
fi

neo4j_http_port="$(get_env_value NEO4J_HTTP_PORT 7474)"
rest_port="$(get_env_value GRAPHITI_REST_PORT 8000)"
mcp_port="$(get_env_value GRAPHITI_MCP_PORT 8001)"
wrapper_port="$(get_env_value GRAPHITI_WRAPPER_PORT 8002)"

wait_for_http_endpoint "http://$bind_ip:$neo4j_http_port" "Neo4j HTTP endpoint"
wait_for_http_endpoint "http://$bind_ip:$rest_port/healthcheck" "Graphiti REST service"
wait_for_http_endpoint "http://$bind_ip:$mcp_port/health" "Graphiti MCP server"
wait_for_http_endpoint "http://$bind_ip:$wrapper_port/health" "Graphiti API wrapper"

bootstrap_python="$(resolve_python)"

if [[ -x "$PYTHON_EXE" ]] && ! python_is_compatible "$PYTHON_EXE"; then
  echo "Existing Graphiti virtual environment uses an unsupported Python version. Recreating .venv with Python 3.10+..."
  rm -rf "$VENV_DIR"
fi

if [[ ! -x "$PYTHON_EXE" ]]; then
  echo "Creating Graphiti virtual environment..."
  "$bootstrap_python" -m venv "$VENV_DIR"
fi

echo "Installing Graphiti dependencies..."
"$PYTHON_EXE" -m pip install --upgrade pip
"$PYTHON_EXE" -m pip install -r "$REQUIREMENTS_FILE"

echo "Running Graphiti smoke test..."
"$PYTHON_EXE" "$SMOKE_TEST"

echo "Graphiti REST: http://$bind_ip:$rest_port"
echo "Graphiti MCP: http://$bind_ip:$mcp_port/mcp/"
echo "Graphiti API Wrapper: http://$bind_ip:$wrapper_port"
echo "Graphiti services are running and the smoke test completed."

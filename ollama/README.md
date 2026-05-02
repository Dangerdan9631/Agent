# Local Ollama setup

This folder runs a local Ollama server for this workspace with:

- chat model: `qwen3:4b`
- embedding model: `nomic-embed-text`

## Prerequisites

- Docker Desktop running
- `docker compose` available

## First run

1. Copy `.env.example` to `.env` if you want to override ports or models.
2. Start the server and pull the models:

   ```powershell
   docker compose -f ollama/compose.yaml up -d
   ```

3. Check the downloaded models:

   ```powershell
   docker compose -f ollama/compose.yaml exec ollama ollama list
   ```

The server will be available at `http://127.0.0.1:11434` by default.

If you leave `LAN_BIND_IP=0.0.0.0` in `ollama/.env`, the service will also be reachable from other devices on your local network via this machine's private LAN IP on port `11434`.

## Client settings

Use these values in tools that support Ollama-compatible endpoints:

- base URL: `http://127.0.0.1:11434`
- chat model: `qwen3:4b`
- embedding model: `nomic-embed-text`

Environment variables:

```text
LAN_BIND_IP=0.0.0.0
AGENT_DOCKER_NETWORK=agent-services
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=qwen3:4b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

`AGENT_DOCKER_NETWORK` is the shared Docker network used by the Graphiti services so they can reach Ollama as `http://ollama:11434` internally.

## Useful commands

Start or update the stack:

```powershell
docker compose -f ollama/compose.yaml up -d
```

Or run the folder-local start script:

```powershell
powershell -ExecutionPolicy Bypass -File ollama/start-ollama.ps1
```

On macOS or Linux:

```bash
bash ollama/start-ollama.sh
```

Stop the stack:

```powershell
docker compose -f ollama/compose.yaml down
```

Tail logs:

```powershell
docker compose -f ollama/compose.yaml logs -f ollama
```

Pull the models again:

```powershell
docker compose -f ollama/compose.yaml run --rm model-init
```
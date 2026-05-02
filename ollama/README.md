# Local Ollama setup

This folder runs a local Ollama server for this workspace with:

- chat model: `qwen3.5:4b`
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
- chat model: `qwen3.5:4b`
- embedding model: `nomic-embed-text`

Environment variables:

```text
LAN_BIND_IP=0.0.0.0
AGENT_DOCKER_NETWORK=agent-services
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CONTEXT_LENGTH=1024
OLLAMA_CHAT_MODEL=qwen3.5:4b
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

In native mode on macOS, the script stays attached to the Homebrew service log after startup so you can watch Ollama output in the same terminal.

Set `OLLAMA_TAIL_LOGS=false` if you need the script to return immediately, for example when another startup script calls it.

Stop the stack:

```powershell
docker compose -f ollama/compose.yaml down
```

Tail logs:

```powershell
docker compose -f ollama/compose.yaml logs -f ollama
```

For native macOS Ollama started through Homebrew:

```bash
tail -f /opt/homebrew/var/log/ollama.log
```

Pull the models again:

```powershell
docker compose -f ollama/compose.yaml run --rm model-init
```
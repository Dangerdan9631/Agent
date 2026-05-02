# Local Graphiti setup

This folder now runs a complete local Graphiti stack against a separately running Ollama service:

- Neo4j database
- Graphiti REST service
- Graphiti MCP server over HTTP
- a repo-local FastAPI wrapper with stable local endpoints
- a Python smoke test using `graphiti-core`

The stack uses Ollama on the shared Docker network for LLM and embedding calls, with these defaults:

- chat model: `qwen3.5:4b`
- embedding model: `nomic-embed-text`
- internal Docker URL: `http://ollama:11434/v1`

## What is included

- `compose.yaml` starts Neo4j plus all network-callable Graphiti services.
- `mcp/config-neo4j-ollama.yaml` configures the MCP server for Neo4j + Ollama.
- `api-wrapper/` contains a local FastAPI wrapper image.
- `requirements.txt` installs the Python smoke test dependencies.
- `quickstart_ollama_neo4j.py` validates direct `graphiti-core` access against the same Neo4j and Ollama stack.

## First run

1. Copy `.env.example` to `.env` if you want to change ports, credentials, or models.
2. Start the full stack:

   ```powershell
   docker compose -f graphiti/compose.yaml up -d
   ```

   Or use the folder-local start script, which starts Neo4j plus all Graphiti endpoints, prepares the Python environment, and executes the smoke test:

   ```powershell
   powershell -ExecutionPolicy Bypass -File graphiti/start-graphiti.ps1
   ```

   On macOS or Linux:

   ```bash
   bash graphiti/start-graphiti.sh
   ```

3. Ensure Ollama is already running and has the configured models pulled before starting Graphiti:

   ```powershell
   docker compose -f ollama/compose.yaml up -d
   ```

4. Create a virtual environment and install dependencies for the smoke test:

   ```powershell
   py -3 -m venv graphiti/.venv
   graphiti/.venv/Scripts/python -m pip install --upgrade pip
   graphiti/.venv/Scripts/python -m pip install -r graphiti/requirements.txt
   ```

5. Run the smoke test directly if you want to verify `graphiti-core` outside Docker:

   ```powershell
   graphiti/.venv/Scripts/python graphiti/quickstart_ollama_neo4j.py
   ```

## LAN endpoints

When `LAN_BIND_IP` is set to `0.0.0.0` or your private LAN IP, these services are reachable from other devices on your local network using this machine's LAN address:

- Graphiti REST: `http://<your-lan-ip>:8000`
- Graphiti MCP: `http://<your-lan-ip>:8001/mcp/`
- Graphiti wrapper: `http://<your-lan-ip>:8002`
- Neo4j browser: `http://<your-lan-ip>:7474`
- Neo4j Bolt: `bolt://<your-lan-ip>:7687`

Keep your router closed and your host firewall limited to private/LAN networks only.

## Useful commands

Start or update the full Graphiti stack:

```powershell
docker compose -f graphiti/compose.yaml up -d
```

Run the full local startup flow:

```powershell
powershell -ExecutionPolicy Bypass -File graphiti/start-graphiti.ps1
```

This script does not start Ollama for you.

macOS or Linux full startup flow:

```bash
bash graphiti/start-graphiti.sh
```

On macOS or Linux, the start script stays attached to the Graphiti Docker logs after startup so you can watch service output in the same terminal.

This script does not start Ollama for you.

Stop Neo4j:

```powershell
docker compose -f graphiti/compose.yaml down
```

Tail all Graphiti service logs:

```powershell
docker compose -f graphiti/compose.yaml logs -f
```

Tail a specific Graphiti service:

```powershell
docker compose -f graphiti/compose.yaml logs -f graphiti-rest graphiti-mcp graphiti-api-wrapper neo4j
```

## Notes

- `OLLAMA_BASE_URL` is used by the local smoke test on the host. `OLLAMA_OPENAI_BASE_URL` is used by the Dockerized Graphiti services on the shared Docker network.
- The upstream Graphiti REST service is configured through `OPENAI_BASE_URL`, `MODEL_NAME`, and `EMBEDDING_MODEL_NAME`, all mapped here to your local Ollama settings.
- The MCP server is exposed over HTTP at `/mcp/`, which is the endpoint to use for MCP-capable clients on your LAN.
- `GRAPHITI_ENABLE_RERANKER` defaults to `false` because local models often vary more on reranking than on extraction and embedding.
- `GRAPHITI_TELEMETRY_ENABLED=false` is set in the example environment to keep this setup local-only by default.
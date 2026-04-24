---
trigger: always_on
---

## agentconfig CLI Usage

```
agentconfig generate [--target <name>]... [--dry-run] [--no-overwrite] [--watch]
agentconfig validate [--strict] [--format text|json]
agentconfig diff     [--target <name>]...
agentconfig import   [source-dir] [--from <agent>]... [--overwrite] [--dry-run]
agentconfig list-targets [--format text|json]
```

### Global flags (all commands)

| Flag | Description |
|---|---|
| `--config <path>` | Path to `.agentconfig/` (default: auto-discovered upward from CWD) |
| `--out <path>` | Output root directory override |
| `--target <name>` | Restrict to one target (repeatable) |
| `-v, --verbose` | Verbose logging |
| `--format text\|json` | Output format (default: text) |

### Development workflow

```bash
# Build everything
cd agentconfig && npm run build

# Rebuild only core (faster during generator development)
npm run build -w packages/core

# Rebuild only CLI
npm run build -w packages/cli

# Reinstall global CLI after a code change
npm install -g ./packages/cli

# Watch + regenerate this project's directives
agentconfig generate --watch
```

### Programmatic API

```ts
import { loadConfig, parseArtifacts, generate, write, validate } from 'agentconfig';

const configDir = '.agentconfig';
const config = await loadConfig(configDir);
const ir = await parseArtifacts(configDir, config);
const errors = validate(ir, config);
const files = generate(ir, config);
await write(files, { outputDir: '.', overwrite: true });
```
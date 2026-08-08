# Atlas CLI

`atlas-cli` consumes portable Atlas module models. It validates declared
architecture rules and writes deterministic graph, layout, analysis, and
`atlas-diagrams.json` artifact data for the Electron desktop application.

## Commands

```sh
atlas-cli validate
atlas-cli generate
atlas-cli diagram landscape
atlas-cli layout landscape
atlas-cli view --open
atlas-cli clean --confirm
```

All commands read `atlas.config.json` from the current directory by default and
accept `--workspace`, `--config`, `--manifest`, and `--output` overrides.
Generate models with `atlas-ts` or `atlas-kt` first. Use `atlas-cli view` for
the browser-hosted interactive viewer or `atlas atlas.config.json` for the
Electron host. Both hosts serve the same generated, language-neutral artifacts.

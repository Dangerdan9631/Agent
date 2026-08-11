# Atlas TypeScript CLI

`atlas-ts` generates one portable Atlas module model per selected TypeScript
package and writes the canonical workspace manifest. Source analysis belongs
to `atlas-ts-sdk`; this package owns command parsing and file output only.

Run `atlas-ts generate` from the target workspace, optionally forwarding the
standard `--workspace`, `--config`, and `--output` options.

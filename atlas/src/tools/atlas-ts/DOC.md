# Atlas TypeScript Generator

`atlas-ts` generates one portable Atlas module model per selected TypeScript
package and writes the canonical workspace manifest. It delegates policy and
artifact interpretation to `atlas-cli` rather than embedding a viewer or
architecture validator.

Run `atlas-ts generate` from the target workspace, optionally forwarding the
standard `--workspace`, `--config`, and `--output` options.

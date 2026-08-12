# Atlas TypeScript CLI

`atlas-ts` generates one portable Atlas module model for one exact TypeScript
package and writes its configured output. Source analysis belongs to
`atlas-ts-sdk`; this package owns package-local configuration and file output.

Run `atlas-ts generate` from the package, optionally forwarding
`--package-root`, `--tsconfig`, or `--output`.

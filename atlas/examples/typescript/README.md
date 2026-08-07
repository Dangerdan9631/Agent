# Atlas TypeScript Example

This npm workspace has an `app` package that depends on a `library` package.
Both import `lodash-es`; the app also imports `date-fns`, and the library also
imports `zod`.

Run `npm run build` here, or `npm run build:example:typescript` from the
repository root. The build typechecks the workspace, runs `atlas-ts generate`,
validates the generated models with `atlas-cli`, and writes diagrams under
`architecture/`.

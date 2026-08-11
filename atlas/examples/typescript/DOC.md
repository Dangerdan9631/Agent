# Atlas TypeScript Reading-List Example

This maintained npm workspace contains exactly two application modules: reusable `@atlas-example/lib` and executable `@atlas-example/app`. The app directly consumes the library's public `ReadingListItem` type; the library never depends on the app.

Both modules declare and use Zod. The library uniquely uses lodash for title normalization and stable slug creation, while the app uniquely uses date-fns at its delivery boundary.

## Run the reading list

From this directory:

```text
npm run demo
```

The command prints the normalized title, stable slug, and current ISO date.

## Exercise Atlas

```text
npm run architecture:models
npm run architecture:validate
npm run architecture:generate
npm run architecture:layout
npm run architecture:view
npm run architecture:clean
```

`npm run build` typechecks the complete workspace, generates portable TypeScript module models, validates every declared architecture rule, and writes graph, matrix, layout, navigation, and viewer artifacts under `architecture/`. From the repository root, use `npm run build:example:typescript`.

`atlas.config.yml` declares the two modules and enforces the one-way `app -> lib` dependency.

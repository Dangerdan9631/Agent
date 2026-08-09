# Atlas TypeScript Clean-Architecture Example

This runnable npm workspace implements a small catalog through four packages:

- `domain` owns catalog identities, item inheritance, title policy, an enum, a type alias, a top-level factory function, and a schema-version constant.
- `application` owns repository, seed-reader, and clock ports plus import and query use cases.
- `infrastructure` implements the ports with in-memory persistence, JSON/Zod validation, and a deterministic clock.
- `app` composes the dependency graph and renders the catalog through a narrow output boundary.

Dependencies point inward: `application -> domain`, `infrastructure -> application + domain`, and `app -> all three`. `lodash-es` is intentionally shared by infrastructure and delivery, while `zod` and `date-fns` remain unique adapter dependencies. The declarations exercise classes, abstract inheritance, interfaces and implementations, an enum, a type alias, constants, functions, method overrides, and cross-package references.

## Run the catalog

From this directory:

```text
npm run demo
```

The deterministic output reports two imported catalog items.

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

The configuration demonstrates every artifact and layout setting, presentation-only module groups, global and package exclusions, selective external collapsing and importer splitting, package diagrams, three folder diagrams, named layers, and every supported rule type. All policies pass for the supplied dependency graph.

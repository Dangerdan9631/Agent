# Atlas Kotlin Clean-Architecture Example

This runnable Gradle build mirrors the TypeScript catalog through four modules:

- `domain` owns catalog identities, item inheritance, title policy, an enum, a type alias, a top-level function, and a top-level schema constant.
- `application` owns repository, seed-reader, and clock ports plus import and query use cases.
- `infrastructure` implements the ports with in-memory persistence, Jackson validation, and a deterministic clock.
- `app` composes the dependency graph and renders the catalog through a narrow output boundary.

Dependencies point inward: `application -> domain`, `infrastructure -> application + domain`, and `app -> all three`. Apache Commons Lang is intentionally shared by infrastructure and delivery, while Jackson Databind and Guava remain unique adapter dependencies. The declarations exercise classes, abstract inheritance, interfaces and implementations, an enum, a type alias, data classes, constants, functions, method overrides, companions, an object composition entry point, and cross-module references.

## Run and build

From this directory:

```text
./gradlew build
./gradlew :app:run
```

From the repository root:

```text
npm run build:example:kotlin
```

The local `dev.atlas.kotlin` plugin invokes `atlas-kt`, produces one portable model per Gradle artifact, aggregates the workspace manifest, validates it through `atlas-cli`, and writes graph, matrix, layout, navigation, and viewer artifacts under `architecture/`.

Useful Gradle tasks include `atlasGenerateModels`, `atlasGenerateManifest`, `atlasValidate`, `atlasGenerate`, and `atlasView`.

The configuration demonstrates every artifact and layout setting, presentation-only module groups, global and module exclusions, selective external collapsing and importer splitting, package diagrams, three folder diagrams, named layers, and every supported rule type. All policies pass for the supplied dependency graph.

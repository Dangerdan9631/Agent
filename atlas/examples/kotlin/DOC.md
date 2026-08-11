# Atlas Kotlin Reading-List Example

This maintained Gradle workspace contains exactly two application modules: reusable `:lib` and executable `:app`. The app directly consumes `ReadingListItem`; the library never depends on the app.

Both modules declare and use Apache Commons Lang. The library uniquely uses Guava for slug normalization, while the app uniquely uses Jackson for command output. The build applies both the Atlas Gradle plugin and KSP processor integration.

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

The local `dev.atlas.kotlin` plugin invokes `atlas-kt-cli`, produces YAML models through `atlas-kt-sdk`, consumes KSP fragments, aggregates `atlas.manifest.yml`, and bridges validation and viewing to the root Atlas applications.

Useful Gradle tasks include `atlasGenerateModels`, `atlasGenerateManifest`, `atlasValidate`, `atlasGenerate`, and `atlasView`.

`atlas.config.yml` declares the two modules and enforces the one-way `app -> lib` dependency.

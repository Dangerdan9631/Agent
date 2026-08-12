# Atlas Kotlin Reading-List Example

This maintained Gradle workspace contains exactly two application modules: reusable `:lib` and executable `:app`. The app directly consumes `ReadingListItem`; the library never depends on the app.

Both modules declare and use Apache Commons Lang. The library uniquely uses Guava for slug normalization, while the app uniquely uses Jackson for command output. Each module explicitly registers its own `jvm` Atlas model.

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

The local `dev.atlas.kotlin` plugin invokes `atlas-kt-cli` once for each explicitly registered project target. It never applies itself to subprojects or invokes project-level Atlas behavior.

Each module exposes `atlasGenerateJvmModel`; ordinary builds run the task because `generateOnBuild` is enabled.

`atlas.config.yml` declares the two modules and enforces the one-way `app -> lib` dependency.

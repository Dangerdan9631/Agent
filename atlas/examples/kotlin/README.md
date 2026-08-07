# Atlas Kotlin Example

This Gradle multi-project build has an `app` module that depends on a `library`
module. Both use Apache Commons Lang; the app additionally uses Guava, and the
library additionally uses Jackson Databind.

The local `dev.atlas.kotlin` plugin invokes `atlas-kt`, aggregates the manifest,
validates it through `atlas-cli`, and writes diagram data under `architecture/`
as part of `gradle build`. Run `npm run build:example:kotlin` from the repository
root for the portable wrapper command.

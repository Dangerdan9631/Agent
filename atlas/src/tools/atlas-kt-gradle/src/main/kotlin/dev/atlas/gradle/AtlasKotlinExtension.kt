package dev.atlas.gradle

/**
 * Configures Kotlin artifact model generation and Atlas CLI bridge tasks.
 */
open class AtlasKotlinExtension {
    /**
     * Determines whether model and manifest generation runs before the project's build task.
     */
    var generateOnBuild: Boolean = true

    /**
     * Names source-set directories relative to the project directory that participate in model generation.
     */
    var sourceDirectories: MutableList<String> = mutableListOf("src/main/kotlin")

    /**
     * Controls whether test source roots are added to the model input in addition to production roots.
     */
    var includeTests: Boolean = false

    /**
     * Selects target or variant labels that should produce a model when the project exposes more than one artifact.
     */
    var includedTargets: MutableList<String> = mutableListOf("*")

    /**
     * Excludes target or variant labels after included-target matching has selected them.
     */
    var excludedTargets: MutableList<String> = mutableListOf()

    /**
     * Supplies an optional stable target or variant component for the generated published artifact identity.
     */
    var artifactVariant: String? = null

    /**
     * Overrides the generated artifact category when a build integration has a more specific published-artifact type.
     */
    var artifactCategory: String? = null

    /**
     * Identifies the published KSP processor dependency injected into selected target-specific KSP configurations.
     */
    var kspProcessorDependency: String = "dev.atlas:atlas-ksp-processor:0.1.0"

    /**
     * Names an optional Atlas CLI executable used by thin Gradle bridge tasks.
     */
    var cliExecutable: String = if (System.getProperty("os.name").startsWith("Windows", ignoreCase = true)) {
        "atlas-cli.cmd"
    } else {
        "atlas-cli"
    }

    /**
     * Names the optional Atlas Electron executable used by the viewer task.
     */
    var viewerExecutable: String = if (System.getProperty("os.name").startsWith("Windows", ignoreCase = true)) {
        "atlas.cmd"
    } else {
        "atlas"
    }
}

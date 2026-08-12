package dev.atlas.gradle

import org.gradle.api.Named
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import javax.inject.Inject

/**
 * Describes one exact Kotlin target compilation and its generated model output.
 */
abstract class AtlasKotlinModelConfiguration @Inject constructor(private val configurationName: String) : Named {
    /** Exact Kotlin target name without wildcard interpretation. */
    abstract val target: Property<String>

    /** Exact compilation name, normally `main`. */
    abstract val compilation: Property<String>

    /** Exact output for this target's generated module model. */
    abstract val modelFile: RegularFileProperty

    /** Explicit KSP semantic fragment files or directories for this target. */
    abstract val semanticFragments: ConfigurableFileCollection

    /** Whether generation is attached to this project's build lifecycle. */
    abstract val generateOnBuild: Property<Boolean>

    /** Returns the stable Gradle container name used for task identity. */
    override fun getName(): String = configurationName

    init {
        generateOnBuild.convention(true)
    }
}

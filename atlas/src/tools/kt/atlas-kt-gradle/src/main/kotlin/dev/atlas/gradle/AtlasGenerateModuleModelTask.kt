package dev.atlas.gradle

import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.FileTree
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Classpath
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.process.ExecOperations
import javax.inject.Inject

/**
 * Invokes the standalone Atlas Kotlin CLI for one Gradle artifact.
 */
abstract class AtlasGenerateModuleModelTask : DefaultTask() {
    /** Holds project-owned settings that supply source roots and artifact metadata. */
    @get:Internal
    lateinit var extension: AtlasKotlinExtension

    /** Provides the standalone Kotlin CLI implementation without exposing it to consuming projects. */
    @get:Classpath
    abstract val generatorClasspath: ConfigurableFileCollection

    /** Names the Java main class used by the standalone CLI artifact. */
    @get:Internal
    abstract val generatorMainClass: Property<String>

    /** Lists Kotlin source files so Gradle invalidates models when source changes. */
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    val kotlinSourceFiles: FileTree
        get() = project.files(extension.sourceDirectories.map { directory ->
            project.fileTree(directory).matching { pattern -> pattern.include("**/*.kt") }
        }).asFileTree

    /** Lists optional KSP semantic fragments so resolved target changes invalidate the model. */
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val semanticFragmentFiles: ConfigurableFileCollection

    /** Defines the generated module-model YAML file. */
    @get:OutputFile
    abstract val outputFile: RegularFileProperty

    /** Exposes Gradle process execution only at this framework boundary. */
    @get:Inject
    abstract val execOperations: ExecOperations

    /** Resolves artifact identity and delegates source extraction to `atlas-kt`. */
    @TaskAction
    fun generate() {
        val artifact = GradleArtifactIdentityResolver(project, extension).resolve()
        execOperations.javaexec { specification ->
            specification.classpath(generatorClasspath)
            specification.mainClass.set(generatorMainClass)
            specification.args(
                "generate",
                "--project-root", project.projectDir.absolutePath,
                "--module-id", artifact.id,
                "--display-name", artifact.displayName,
                "--version", artifact.version,
                "--category", artifact.category,
                "--output", outputFile.get().asFile.absolutePath
            )
            extension.sourceDirectories.forEach { sourceDirectory ->
                specification.args("--source-root", sourceDirectory)
            }
            semanticFragmentFiles.files.sortedBy { file -> file.path }.forEach { fragment ->
                specification.args("--semantic-fragment", fragment.absolutePath)
            }
        }
    }
}

package dev.atlas.gradle

import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Classpath
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.process.ExecOperations
import javax.inject.Inject

/**
 * Invokes the standalone Atlas Kotlin CLI for one explicitly configured target compilation.
 */
abstract class AtlasGenerateModuleModelTask : DefaultTask() {
    /** Provides the standalone Kotlin CLI implementation. */
    @get:Classpath abstract val generatorClasspath: ConfigurableFileCollection
    /** Names the standalone generator main class. */
    @get:Internal abstract val generatorMainClass: Property<String>
    /** Stable `group:name:version:target` module identity. */
    @get:Input abstract val moduleId: Property<String>
    /** Evaluated publication or project name. */
    @get:Input abstract val moduleName: Property<String>
    /** Evaluated publication or project version. */
    @get:Input abstract val moduleVersion: Property<String>
    /** Exact configured Kotlin target. */
    @get:Input abstract val moduleVariant: Property<String>
    /** Category derived from the applied Kotlin or Android plugin. */
    @get:Input abstract val moduleCategory: Property<String>
    /** Source roots supplied by the selected compilation. */
    @get:InputFiles @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val sourceRoots: ConfigurableFileCollection
    /** Explicit semantic fragment files or directories. */
    @get:InputFiles @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val semanticFragmentFiles: ConfigurableFileCollection
    /** Module-model output derived from the configured root and Kotlin build target. */
    @get:OutputFile abstract val outputFile: RegularFileProperty
    /** Process execution boundary supplied by Gradle. */
    @get:Inject abstract val execOperations: ExecOperations

    /** Resolves configured files and delegates extraction to `atlas-kt`. */
    @TaskAction
    fun generate() {
        execOperations.javaexec { specification ->
            specification.classpath(generatorClasspath)
            specification.mainClass.set(generatorMainClass)
            specification.args(
                "generate", "--project-root", project.projectDir.absolutePath,
                "--module-id", moduleId.get(), "--display-name", moduleName.get(),
                "--version", moduleVersion.get(), "--category", moduleCategory.get(),
                "--variant", moduleVariant.get(),
                "--target-name", outputFile.get().asFile.name.removeSuffix(".atlas.module.yml"),
                "--root", outputFile.get().asFile.parentFile.parentFile.absolutePath
            )
            sourceRoots.files.filter { file -> file.isDirectory }.sortedBy { file -> file.path }.forEach { root ->
                val relativeRoot = project.projectDir.toPath().relativize(root.toPath()).toString()
                    .replace(java.io.File.separatorChar, '/')
                specification.args("--source-root", relativeRoot)
            }
            semanticFragmentFiles.asFileTree.matching { pattern -> pattern.include("**/*.atlas.fragment.yml") }
                .files.sortedBy { file -> file.path }.forEach { fragment ->
                    specification.args("--semantic-fragment", fragment.absolutePath)
                }
        }
    }
}

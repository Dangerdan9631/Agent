package dev.atlas.gradle

import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.InputDirectory
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction
import java.io.File

/**
 * Aggregates generated Kotlin module models into one deterministic Atlas workspace manifest.
 */
abstract class AtlasGenerateWorkspaceManifestTask : DefaultTask() {
    /** Defines the directory containing generated module JSON files. */
    @get:InputDirectory
    abstract val inputDirectory: DirectoryProperty

    /** Defines the canonical generated manifest file. */
    @get:OutputFile
    abstract val manifestFile: RegularFileProperty

    /** Writes model paths and expected opaque artifact IDs in deterministic order. */
    @TaskAction
    fun generate() {
        val directory = inputDirectory.get().asFile
        val models = directory.walkTopDown()
            .filter { file -> file.isFile && file.name.endsWith(".atlas-module.json") }
            .sortedBy { file -> directory.toPath().relativize(file.toPath()).toString() }
            .toList()
        val entries = models.map { file -> AtlasWorkspaceManifestDocument.entry(file, directory) }
        val manifest = AtlasWorkspaceManifestDocument(entries).render()
        val output = manifestFile.get().asFile
        output.parentFile.mkdirs()
        output.writeText(manifest)
    }
}

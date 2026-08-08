package dev.atlas.kt

import java.io.File

/**
 * Extracts deterministic portable declarations and imports from Kotlin source roots.
 */
class KotlinSourceModelExtractor(
    private val request: KotlinModelGenerationRequest
) {
    /**
     * Produces one complete source-derived model snapshot.
     *
     * @return Ordered elements and relationships owned by the configured artifact.
     */
    fun extract(): KotlinSourceExtraction {
        val results = this.sourceFiles().map { sourceFile ->
            KotlinSourceFileModelBuilder(
                this.request.moduleId,
                this.relativePath(sourceFile)
            ).build(sourceFile.readText())
        }
        val source = KotlinSourceExtraction(
            results.flatMap { result -> result.elements }.distinctBy { element -> element.id }
                .sortedBy { element -> element.id },
            results.flatMap { result -> result.relationships }.distinctBy { relationship -> relationship.id }
                .sortedBy { relationship -> relationship.id }
        )
        val fragments = KotlinSemanticFragmentReader().read(this.request.semanticFragments)
        return KotlinSemanticModelMerger(this.request.moduleId).merge(source, fragments)
    }

    /**
     * Lists Kotlin source files from every configured root in stable normalized-path order.
     *
     * @return Existing Kotlin files that participate in model generation.
     */
    private fun sourceFiles(): List<File> {
        return this.request.sourceRoots.flatMap { sourceRoot ->
            File(this.request.projectRoot, sourceRoot).walkTopDown()
                .filter { file -> file.isFile && file.extension == "kt" }
                .toList()
        }.distinctBy { file -> file.canonicalPath }
            .sortedBy { file -> this.relativePath(file) }
    }

    /**
     * Converts one source file path into the portable project-relative form.
     *
     * @param file Kotlin source file beneath the configured project root.
     * @return Slash-normalized project-relative source path.
     */
    private fun relativePath(file: File): String {
        val relativePath = this.request.projectRoot.toPath().relativize(file.toPath())
        require(!relativePath.startsWith("..")) {
            "Atlas Kotlin sources must remain inside the configured project root: ${file.path}"
        }
        return relativePath.toString().replace(File.separatorChar, '/')
    }
}

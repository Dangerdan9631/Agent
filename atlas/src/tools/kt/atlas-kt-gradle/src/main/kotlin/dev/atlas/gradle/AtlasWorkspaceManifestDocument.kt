package dev.atlas.gradle

import java.io.File

/**
 * Serializes the Gradle build's deterministic portable workspace manifest.
 */
class AtlasWorkspaceManifestDocument(
    private val entries: List<AtlasWorkspaceManifestEntry>
) {
    /**
     * Renders the canonical workspace manifest with entries in artifact identity order.
     *
     * @return Formatted manifest YAML with a trailing newline.
     */
    fun render(): String {
        val modules = entries.sortedBy { entry -> entry.moduleId }.joinToString("\n") { entry ->
            "  - moduleId: ${this.quote(entry.moduleId)}\n    modelPath: ${this.quote(entry.modelPath)}"
        }
        return "schemaVersion: 1\nmodules:\n$modules\n"
    }

    /**
     * Quotes a YAML scalar using JSON-compatible double-quoted escaping.
     *
     * @param value Raw text value.
     * @return YAML-safe scalar including surrounding quotes.
     */
    private fun quote(value: String): String {
        return "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""
    }

    companion object {
        /**
         * Reads one generated module identity and builds its manifest entry.
         *
         * @param modelFile Generated module-model YAML file.
         * @param modelsDirectory Directory containing all generated models.
         * @return Identity and manifest-relative path for the generated model.
         */
        fun entry(modelFile: File, modelsDirectory: File): AtlasWorkspaceManifestEntry {
            val moduleId = Regex("(?m)^  id: \\\"([^\\\"]+)\\\"$")
                .find(modelFile.readText())?.groupValues?.get(1)
                ?.replace("\\\"", "\"")
                ?.replace("\\\\", "\\")
                ?: throw IllegalArgumentException("Generated Atlas model '${modelFile.path}' has no module ID.")
            val modelPath = modelsDirectory.toPath().relativize(modelFile.toPath()).toString()
                .replace(File.separatorChar, '/')
            return AtlasWorkspaceManifestEntry(moduleId, modelPath)
        }
    }
}

/**
 * Locates one generated module model from a workspace manifest.
 *
 * @property moduleId Expected opaque artifact identity.
 * @property modelPath Manifest-relative model path.
 */
data class AtlasWorkspaceManifestEntry(
    val moduleId: String,
    val modelPath: String
)

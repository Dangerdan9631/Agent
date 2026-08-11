package dev.atlas.kt

import java.io.File

/**
 * Describes one independently generated Kotlin artifact model.
 *
 * @property projectRoot Directory used to normalize source paths.
 * @property moduleId Stable published artifact identity.
 * @property displayName Readable artifact name.
 * @property version Published artifact version.
 * @property category Portable artifact family label.
 * @property sourceRoots Kotlin source directories relative to the project root.
 * @property semanticFragments Optional KSP fragment files that refine source-derived semantics.
 * @property outputFile Destination module-model YAML file.
 */
data class KotlinModelGenerationRequest(
    val projectRoot: File,
    val moduleId: String,
    val displayName: String,
    val version: String,
    val category: String,
    val sourceRoots: List<String>,
    val semanticFragments: List<File>,
    val outputFile: File
)

/**
 * Converts command-line flags into a validated Kotlin model-generation request.
 */
class KotlinModelGenerationRequestParser(
    private val arguments: List<String>
) {
    /**
     * Parses all required flags and normalizes paths before generation starts.
     *
     * @return Validated immutable generation request.
     */
    fun parse(): KotlinModelGenerationRequest {
        val values = this.toValues()
        val projectRoot = File(this.required(values, "--project-root")).canonicalFile
        val sourceRootValues = values["--source-root"].orEmpty()
        if (sourceRootValues.isEmpty()) {
            throw IllegalArgumentException("atlas-kt requires at least one --source-root.")
        }
        val sourceRoots = sourceRootValues.map { value ->
            val sourceRoot = File(projectRoot, value).canonicalFile
            require(sourceRoot.toPath().startsWith(projectRoot.toPath())) {
                "atlas-kt source root must be inside --project-root: $value"
            }
            projectRoot.toPath().relativize(sourceRoot.toPath()).toString()
                .ifBlank { "." }
                .replace(File.separatorChar, '/')
        }.distinct().sorted()
        return KotlinModelGenerationRequest(
            projectRoot,
            this.required(values, "--module-id"),
            this.required(values, "--display-name"),
            this.required(values, "--version"),
            this.required(values, "--category"),
            sourceRoots,
            values["--semantic-fragment"].orEmpty()
                .map { path -> File(path).canonicalFile }
                .distinctBy { file -> file.path }
                .sortedBy { file -> file.path },
            File(this.required(values, "--output")).canonicalFile
        )
    }

    /**
     * Groups repeated flags while rejecting positional values and unknown flag forms.
     *
     * @return Values keyed by their command-line flag.
     */
    private fun toValues(): Map<String, List<String>> {
        val values = mutableMapOf<String, MutableList<String>>()
        var index = 0
        while (index < this.arguments.size) {
            val flag = this.arguments[index]
            if (!flag.startsWith("--")) {
                throw IllegalArgumentException("atlas-kt does not accept positional argument '$flag'.")
            }
            val value = this.arguments.getOrNull(index + 1)
                ?: throw IllegalArgumentException("atlas-kt requires a value after '$flag'.")
            if (value.startsWith("--")) {
                throw IllegalArgumentException("atlas-kt requires a value after '$flag'.")
            }
            values.getOrPut(flag) { mutableListOf() }.add(value)
            index += 2
        }
        return values
    }

    /**
     * Reads exactly one non-empty required flag value.
     *
     * @param values Parsed command values.
     * @param flag Required flag name.
     * @return Non-empty flag value.
     */
    private fun required(values: Map<String, List<String>>, flag: String): String {
        val matches = values[flag].orEmpty()
        if (matches.size != 1 || matches.single().isBlank()) {
            throw IllegalArgumentException("atlas-kt requires exactly one non-empty $flag value.")
        }
        return matches.single()
    }
}

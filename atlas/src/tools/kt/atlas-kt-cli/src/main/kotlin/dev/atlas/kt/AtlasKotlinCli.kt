package dev.atlas.kt

import java.io.File

/**
 * Parses Kotlin generator commands and coordinates deterministic model writing.
 */
class AtlasKotlinCli {
    /**
     * Executes one supported command without retaining process-global state.
     *
     * @param arguments Command-line arguments after the executable name.
     * @return Completed command status and optional user-facing message.
     */
    fun run(arguments: List<String>): AtlasKotlinCommandResult {
        return try {
            if (arguments.firstOrNull() != "generate") {
                AtlasKotlinCommandResult(2, "atlas-kt requires the 'generate' command.")
            } else {
                val request = KotlinModelGenerationRequestParser(arguments.drop(1)).parse()
                val model = KotlinSourceModelExtractor(request).extract()
                AtlasKotlinModelDocument(request, model.elements, model.relationships).write()
                AtlasKotlinCommandResult(0, null)
            }
        } catch (error: IllegalArgumentException) {
            AtlasKotlinCommandResult(2, error.message ?: "atlas-kt received invalid arguments.")
        } catch (error: Exception) {
            AtlasKotlinCommandResult(1, error.message ?: "atlas-kt could not generate a model.")
        }
    }
}

/**
 * Represents the externally visible completion state of one Kotlin CLI invocation.
 *
 * @property exitCode Process status where zero denotes success.
 * @property message Optional user-facing diagnostic text.
 */
data class AtlasKotlinCommandResult(
    val exitCode: Int,
    val message: String?
)

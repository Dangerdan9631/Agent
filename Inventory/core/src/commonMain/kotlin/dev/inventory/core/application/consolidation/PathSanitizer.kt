package dev.inventory.core.application.consolidation

/**
 * Makes user-supplied labels safe to use as single path segments on common filesystems.
 */
class PathSanitizer {
    /**
     * Returns the label with reserved characters replaced by underscores and surrounding whitespace or dots removed; never empty.
     */
    fun segment(label: String): String {
        val cleaned = label.map { if (it in RESERVED || it.code < 32) '_' else it }.joinToString("").trim().trimEnd('.')
        return cleaned.ifEmpty { "_" }
    }

    private companion object {
        val RESERVED = setOf('<', '>', ':', '"', '/', '\\', '|', '?', '*')
    }
}

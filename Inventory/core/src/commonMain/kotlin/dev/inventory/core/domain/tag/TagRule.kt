package dev.inventory.core.domain.tag

/**
 * A rule that selects files for bulk tagging by extension list and/or relative path glob.
 */
data class TagRule(
    /**
     * Tag to apply to every matching file.
     */
    val tagId: Long,
    /**
     * Lowercase extensions without dots that match; empty means any extension.
     */
    val extensions: Set<String>,
    /**
     * Glob over the forward-slash relative path using "*" and "**" wildcards; null means any path.
     */
    val pathGlob: String?,
)

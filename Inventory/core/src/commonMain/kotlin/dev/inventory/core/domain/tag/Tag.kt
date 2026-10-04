package dev.inventory.core.domain.tag

/**
 * A user-defined label that can be attached to any number of files.
 */
data class Tag(
    /**
     * Database identifier; 0 for a tag that has not been persisted yet.
     */
    val id: Long,
    /**
     * Unique, case-insensitive display name.
     */
    val name: String,
    /**
     * Display color as an opaque 0xRRGGBB integer.
     */
    val color: Int,
)

package dev.inventory.core.port

import dev.inventory.core.domain.duplicate.DuplicateGroup

/**
 * A duplicate group together with aggregate figures for list display.
 */
data class DuplicateGroupSummary(
    /**
     * The group itself.
     */
    val group: DuplicateGroup,
    /**
     * Number of members in the group.
     */
    val memberCount: Long,
    /**
     * Combined size in bytes of all members.
     */
    val totalBytes: Long,
    /**
     * Display name of a representative member, for example the first file's name.
     */
    val sampleName: String,
)

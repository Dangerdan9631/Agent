package dev.inventory.core.domain.duplicate

/**
 * Membership of one file or directory in a duplicate group.
 */
data class DuplicateGroupMember(
    /**
     * Group the member belongs to.
     */
    val groupId: Long,
    /**
     * FileEntry identifier for EXACT and PROBABLE groups, or DirectoryEntry identifier for FOLDER groups.
     */
    val memberId: Long,
    /**
     * Match strength for this member in the range 0.0 to 1.0; 1.0 for exact matches.
     */
    val score: Double,
)

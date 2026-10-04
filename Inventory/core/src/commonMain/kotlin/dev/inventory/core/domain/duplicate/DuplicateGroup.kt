package dev.inventory.core.domain.duplicate

/**
 * A set of files (or directories) believed to be copies of one another, plus the review decision for the set.
 */
data class DuplicateGroup(
    /**
     * Database identifier; 0 for a group that has not been persisted yet.
     */
    val id: Long,
    /**
     * Evidence strength for the group.
     */
    val kind: DuplicateGroupKind,
    /**
     * Stable machine-readable reason code such as "same-content" or "visual-similar".
     */
    val reason: String,
    /**
     * Confidence in the range 0.0 to 1.0 that the members really are duplicates.
     */
    val confidence: Double,
    /**
     * Deterministic key derived from the sorted member identifiers so re-analysis finds the same group.
     */
    val memberKey: String,
    /**
     * Identifier of the member chosen to keep, or null while undecided.
     */
    val keeperFileId: Long?,
    /**
     * Review progress for the group.
     */
    val reviewState: ReviewState,
    /**
     * Epoch milliseconds when the group was first detected.
     */
    val detectedAt: Long,
)

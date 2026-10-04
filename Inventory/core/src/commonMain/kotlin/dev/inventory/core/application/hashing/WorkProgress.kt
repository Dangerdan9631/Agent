package dev.inventory.core.application.hashing

/**
 * Progress of a long-running background pass expressed as items processed against an estimated total.
 */
data class WorkProgress(
    /**
     * Human readable phase name.
     */
    val phase: String,
    /**
     * Items processed so far.
     */
    val done: Long,
    /**
     * Estimated total items, or null when unknown.
     */
    val total: Long?,
    /**
     * Description of the item currently being processed.
     */
    val current: String,
    /**
     * Duplicate groups newly saved or updated during this run.
     */
    val groupsFound: Long = 0,
)

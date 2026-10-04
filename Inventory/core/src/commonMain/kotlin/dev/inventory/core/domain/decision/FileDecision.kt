package dev.inventory.core.domain.decision

/**
 * The recorded consolidation decision for one file.
 */
data class FileDecision(
    /**
     * File the decision applies to.
     */
    val fileId: Long,
    /**
     * The chosen outcome for the file.
     */
    val decision: Decision,
    /**
     * Free-form user note explaining the decision, or null.
     */
    val note: String?,
    /**
     * Epoch milliseconds when the decision was last changed.
     */
    val decidedAt: Long,
)

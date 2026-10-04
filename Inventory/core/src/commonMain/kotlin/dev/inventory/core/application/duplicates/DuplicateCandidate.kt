package dev.inventory.core.application.duplicates

import dev.inventory.core.domain.duplicate.DuplicateGroupKind

/**
 * A proposed duplicate group produced by a detector before it is persisted.
 */
data class DuplicateCandidate(
    /**
     * Evidence strength of the proposal.
     */
    val kind: DuplicateGroupKind,
    /**
     * Stable reason code describing which rule produced the proposal.
     */
    val reason: String,
    /**
     * Confidence in the range 0.0 to 1.0.
     */
    val confidence: Double,
    /**
     * Member identifiers paired with their individual match scores; at least two members.
     */
    val members: List<Pair<Long, Double>>,
) {
    /**
     * Returns the deterministic key used to recognize this same group across analysis runs.
     */
    val memberKey: String
        get() = kind.name + ":" + members.map { it.first }.sorted().joinToString(",")
}

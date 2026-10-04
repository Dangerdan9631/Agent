package dev.inventory.core.domain.duplicate

/**
 * Strength of the evidence that the members of a duplicate group are the same thing.
 */
enum class DuplicateGroupKind {
    /**
     * Members have identical full content hashes.
     */
    EXACT,

    /**
     * Members matched a heuristic or fingerprint rule and need human review.
     */
    PROBABLE,

    /**
     * Members are directories whose entire trees hash identically.
     */
    FOLDER,
}

package dev.inventory.core.domain.consolidation

/**
 * What to do when two planned files resolve to the same destination path.
 */
enum class ConflictPolicyKind {
    /**
     * Append a numeric suffix such as " (2)" before the extension until the path is unique.
     */
    RENAME_WITH_SUFFIX,

    /**
     * Leave the later file where it is and record a SKIP action for it.
     */
    SKIP,
}

package dev.inventory.core.port

/**
 * Duplicate-membership filter for file queries.
 */
enum class DuplicateStatusFilter {
    /**
     * No duplicate filter.
     */
    ANY,

    /**
     * Files that belong to at least one EXACT or PROBABLE group.
     */
    IN_ANY_GROUP,

    /**
     * Files that belong to no EXACT or PROBABLE group.
     */
    NOT_IN_GROUP,

    /**
     * Files that belong to at least one EXACT group.
     */
    EXACT,

    /**
     * Files that belong to at least one PROBABLE group.
     */
    PROBABLE,
}

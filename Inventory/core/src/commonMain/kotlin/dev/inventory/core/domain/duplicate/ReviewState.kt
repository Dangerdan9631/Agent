package dev.inventory.core.domain.duplicate

/**
 * Review progress of a duplicate group.
 */
enum class ReviewState {
    /**
     * Nobody has decided what to do with the group yet.
     */
    OPEN,

    /**
     * A keeper has been chosen and the other members are marked for discard.
     */
    RESOLVED,

    /**
     * The user judged the group to be a false positive; its members are not duplicates.
     */
    DISMISSED,
}

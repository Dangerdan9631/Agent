package dev.inventory.core.domain.consolidation

/**
 * The operation a consolidation action performs on its file.
 */
enum class ActionKind {
    /**
     * Copy the file to the destination, verify the copy, then delete the source.
     */
    MOVE,

    /**
     * Delete a redundant source copy once the group's keeper has been verified at the destination.
     */
    DELETE_REDUNDANT,

    /**
     * Do nothing; recorded so the user can see why a file was left alone.
     */
    SKIP,
}

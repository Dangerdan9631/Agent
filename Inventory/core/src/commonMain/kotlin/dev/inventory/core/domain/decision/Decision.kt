package dev.inventory.core.domain.decision

/**
 * What the user wants to happen to a file when the inventory is consolidated.
 */
enum class Decision {
    /**
     * No decision has been recorded; the planner treats the file as a keep candidate unless a group says otherwise.
     */
    UNDECIDED,

    /**
     * The file should be moved into the consolidated tree.
     */
    KEEP,

    /**
     * The file is redundant and may be deleted once a verified copy exists in the consolidated tree.
     */
    DISCARD,
}

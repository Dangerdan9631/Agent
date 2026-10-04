package dev.inventory.core.domain.consolidation

/**
 * Journal state of a consolidation action; the executor only advances forward and never deletes before VERIFIED.
 */
enum class ActionState {
    /**
     * Nothing has been done yet.
     */
    PENDING,

    /**
     * Bytes were written to a temporary destination file but the hash has not been confirmed.
     */
    COPIED,

    /**
     * The destination file matches the source hash and has been renamed into its final place.
     */
    VERIFIED,

    /**
     * The source file has been deleted after verification; the action is complete.
     */
    SOURCE_DELETED,

    /**
     * The action was abandoned because of an error; both source and destination are left untouched.
     */
    FAILED,

    /**
     * The action required no work and is complete.
     */
    SKIPPED,
}

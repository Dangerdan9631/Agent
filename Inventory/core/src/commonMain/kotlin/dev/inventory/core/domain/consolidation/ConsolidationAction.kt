package dev.inventory.core.domain.consolidation

/**
 * One journaled step of a consolidation plan for a single file.
 */
data class ConsolidationAction(
    /**
     * Database identifier; 0 for an action that has not been persisted yet.
     */
    val id: Long,
    /**
     * Plan the action belongs to.
     */
    val planId: Long,
    /**
     * File the action operates on.
     */
    val fileId: Long,
    /**
     * Absolute source path in platform-native form.
     */
    val sourcePath: String,
    /**
     * Absolute destination path in platform-native form, or null for DELETE_REDUNDANT and SKIP actions.
     */
    val destinationPath: String?,
    /**
     * Operation to perform.
     */
    val kind: ActionKind,
    /**
     * Journal state.
     */
    val state: ActionState,
    /**
     * Human readable reason for SKIP actions or the failure message for FAILED actions, otherwise null.
     */
    val message: String?,
    /**
     * Identifier of the MOVE action that must be VERIFIED before a DELETE_REDUNDANT action may run, otherwise null.
     */
    val dependsOnActionId: Long?,
    /**
     * Epoch milliseconds of the last state change.
     */
    val updatedAt: Long,
)

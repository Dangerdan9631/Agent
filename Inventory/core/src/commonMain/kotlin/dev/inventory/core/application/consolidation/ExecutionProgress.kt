package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.consolidation.ActionState

/**
 * Snapshot of a running consolidation emitted after every action.
 */
data class ExecutionProgress(
    /**
     * Number of actions currently in each state.
     */
    val counts: Map<ActionState, Long>,
    /**
     * Source path of the action most recently processed.
     */
    val currentPath: String,
    /**
     * Human readable phase.
     */
    val phase: String,
) {
    /**
     * Total actions across all states.
     */
    val total: Long
        get() = counts.values.sum()

    /**
     * Actions that reached a terminal state.
     */
    val finished: Long
        get() = counts.filterKeys { it in TERMINAL }.values.sum()

    private companion object {
        val TERMINAL = setOf(ActionState.SOURCE_DELETED, ActionState.FAILED, ActionState.SKIPPED)
    }
}

package dev.inventory.core.domain.consolidation

/**
 * Lifecycle state of a consolidation plan.
 */
enum class PlanStatus {
    /**
     * Actions have been generated but execution has not started.
     */
    DRAFT,

    /**
     * Actions are being executed.
     */
    RUNNING,

    /**
     * Every action reached a terminal state.
     */
    COMPLETED,

    /**
     * Execution stopped early because of cancellation; pending actions remain.
     */
    PAUSED,
}

package dev.inventory.core.port

import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.PlanStatus

/**
 * Persistence for consolidation plans and their journaled actions.
 */
interface ConsolidationRepository {
    /**
     * Inserts a plan and returns it with its identifier.
     */
    suspend fun createPlan(plan: ConsolidationPlan): ConsolidationPlan

    /**
     * Returns every plan, newest first.
     */
    suspend fun plans(): List<ConsolidationPlan>

    /**
     * Returns the plan with the given identifier, or null.
     */
    suspend fun plan(id: Long): ConsolidationPlan?

    /**
     * Updates the lifecycle state of a plan.
     */
    suspend fun updateStatus(planId: Long, status: PlanStatus)

    /**
     * Deletes a plan and its actions.
     */
    suspend fun deletePlan(planId: Long)

    /**
     * Inserts one action and returns it with its identifier.
     */
    suspend fun insertAction(action: ConsolidationAction): ConsolidationAction

    /**
     * Inserts many actions in one transaction; identifiers on the inputs are ignored and not returned.
     */
    suspend fun insertActions(actions: List<ConsolidationAction>)

    /**
     * Returns the action with the given identifier, or null.
     */
    suspend fun action(id: Long): ConsolidationAction?

    /**
     * Returns the identifier of the plan's MOVE action for each file that has one, keyed by file identifier.
     */
    suspend fun moveActionIdsByFile(planId: Long): Map<Long, Long>

    /**
     * Returns a page of the plan's actions ordered by identifier, optionally restricted to the given states.
     */
    suspend fun actions(planId: Long, states: Set<ActionState>?, limit: Int, offset: Int): List<ConsolidationAction>

    /**
     * Returns the number of actions in each state for the plan.
     */
    suspend fun countsByState(planId: Long): Map<ActionState, Long>

    /**
     * Returns up to limit actions that still need work (PENDING, COPIED, or VERIFIED) ordered by identifier.
     */
    suspend fun nextActionable(planId: Long, limit: Int): List<ConsolidationAction>

    /**
     * Records a state transition for an action.
     */
    suspend fun updateActionState(actionId: Long, state: ActionState, message: String?, at: Long)

    /**
     * Resets every FAILED action of the plan to PENDING and returns how many were reset.
     */
    suspend fun resetFailed(planId: Long, at: Long): Long
}

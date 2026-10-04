package dev.inventory.core.support

import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.PlanStatus
import dev.inventory.core.port.ConsolidationRepository

/**
 * In-memory ConsolidationRepository used by core unit tests.
 */
class InMemoryConsolidationRepository : ConsolidationRepository {
    private val plans = LinkedHashMap<Long, ConsolidationPlan>()
    private val actions = LinkedHashMap<Long, ConsolidationAction>()
    private var nextPlanId = 1L
    private var nextActionId = 1L

    override suspend fun createPlan(plan: ConsolidationPlan): ConsolidationPlan {
        val stored = plan.copy(id = nextPlanId++)
        plans[stored.id] = stored
        return stored
    }

    override suspend fun plans(): List<ConsolidationPlan> = plans.values.sortedByDescending { it.id }

    override suspend fun plan(id: Long): ConsolidationPlan? = plans[id]

    override suspend fun updateStatus(planId: Long, status: PlanStatus) {
        plans[planId]?.let { plans[planId] = it.copy(status = status) }
    }

    override suspend fun deletePlan(planId: Long) {
        plans.remove(planId)
        actions.values.filter { it.planId == planId }.forEach { actions.remove(it.id) }
    }

    override suspend fun insertAction(action: ConsolidationAction): ConsolidationAction {
        val stored = action.copy(id = nextActionId++)
        actions[stored.id] = stored
        return stored
    }

    override suspend fun insertActions(actions: List<ConsolidationAction>) {
        for (action in actions) {
            insertAction(action)
        }
    }

    override suspend fun action(id: Long): ConsolidationAction? = actions[id]

    override suspend fun moveActionIdsByFile(planId: Long): Map<Long, Long> =
        actions.values.filter { it.planId == planId && it.kind == ActionKind.MOVE }.associate { it.fileId to it.id }

    override suspend fun actions(planId: Long, states: Set<ActionState>?, limit: Int, offset: Int): List<ConsolidationAction> =
        actions.values
            .filter { it.planId == planId && (states == null || it.state in states) }
            .sortedBy { it.id }
            .drop(offset).take(limit)

    override suspend fun countsByState(planId: Long): Map<ActionState, Long> =
        actions.values.filter { it.planId == planId }.groupingBy { it.state }.eachCount().mapValues { it.value.toLong() }

    override suspend fun nextActionable(planId: Long, limit: Int): List<ConsolidationAction> =
        actions.values
            .filter { it.planId == planId && it.state in ACTIONABLE }
            .sortedBy { it.id }
            .take(limit)

    override suspend fun updateActionState(actionId: Long, state: ActionState, message: String?, at: Long) {
        actions[actionId]?.let { actions[actionId] = it.copy(state = state, message = message, updatedAt = at) }
    }

    override suspend fun resetFailed(planId: Long, at: Long): Long {
        val failed = actions.values.filter { it.planId == planId && it.state == ActionState.FAILED }
        failed.forEach { actions[it.id] = it.copy(state = ActionState.PENDING, message = null, updatedAt = at) }
        return failed.size.toLong()
    }

    private companion object {
        val ACTIONABLE = setOf(ActionState.PENDING, ActionState.COPIED, ActionState.VERIFIED)
    }
}

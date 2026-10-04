package dev.inventory.data.repository

import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.domain.consolidation.PlanStatus
import dev.inventory.core.port.ConsolidationRepository
import dev.inventory.data.db.Consolidation_action
import dev.inventory.data.db.Consolidation_plan
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.InventoryDatabase

/**
 * ConsolidationRepository backed by the SQLDelight consolidation tables.
 */
class SqlDelightConsolidationRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : ConsolidationRepository {
    private val queries get() = database.consolidationQueries

    override suspend fun createPlan(plan: ConsolidationPlan): ConsolidationPlan = executor.run {
        database.transactionWithResult {
            queries.insertPlan(
                destination_root = plan.destinationRoot,
                layout_strategy = plan.layoutStrategy.name,
                conflict_policy = plan.conflictPolicy.name,
                remove_redundant_exact = if (plan.removeRedundantExact) 1 else 0,
                status = plan.status.name,
                created_at = plan.createdAt,
            )
            plan.copy(id = queries.lastInsertedId().executeAsOne())
        }
    }

    override suspend fun plans(): List<ConsolidationPlan> =
        executor.run { queries.selectPlans().executeAsList().map { it.toDomain() } }

    override suspend fun plan(id: Long): ConsolidationPlan? =
        executor.run { queries.selectPlan(id).executeAsOneOrNull()?.toDomain() }

    override suspend fun updateStatus(planId: Long, status: PlanStatus) =
        executor.run { queries.updatePlanStatus(status.name, planId); Unit }

    override suspend fun deletePlan(planId: Long) = executor.run { queries.deletePlan(planId); Unit }

    override suspend fun insertAction(action: ConsolidationAction): ConsolidationAction = executor.run {
        database.transactionWithResult {
            insertRow(action)
            action.copy(id = queries.lastInsertedId().executeAsOne())
        }
    }

    override suspend fun insertActions(actions: List<ConsolidationAction>) = executor.run {
        database.transaction { actions.forEach { insertRow(it) } }
    }

    override suspend fun action(id: Long): ConsolidationAction? =
        executor.run { queries.selectAction(id).executeAsOneOrNull()?.toDomain() }

    override suspend fun moveActionIdsByFile(planId: Long): Map<Long, Long> = executor.run {
        val result = HashMap<Long, Long>()
        queries.selectMoveActionIds(planId) { id, fileId -> result[fileId] = id }.executeAsList()
        result
    }

    override suspend fun actions(planId: Long, states: Set<ActionState>?, limit: Int, offset: Int): List<ConsolidationAction> =
        executor.run {
            if (states == null) {
                queries.selectActions(planId, limit.toLong(), offset.toLong())
            } else {
                queries.selectActionsInStates(planId, states.map { it.name }, limit.toLong(), offset.toLong())
            }.executeAsList().map { it.toDomain() }
        }

    override suspend fun countsByState(planId: Long): Map<ActionState, Long> = executor.run {
        queries.countsByState(planId).executeAsList().associate { ActionState.valueOf(it.state) to it.n }
    }

    override suspend fun nextActionable(planId: Long, limit: Int): List<ConsolidationAction> =
        executor.run { queries.selectNextActionable(planId, limit.toLong()).executeAsList().map { it.toDomain() } }

    override suspend fun updateActionState(actionId: Long, state: ActionState, message: String?, at: Long) =
        executor.run { queries.updateActionState(state.name, message, at, actionId); Unit }

    override suspend fun resetFailed(planId: Long, at: Long): Long = executor.run { queries.resetFailed(at, planId).value }

    private fun insertRow(action: ConsolidationAction) {
        queries.insertAction(
            plan_id = action.planId,
            file_id = action.fileId,
            source_path = action.sourcePath,
            destination_path = action.destinationPath,
            kind = action.kind.name,
            state = action.state.name,
            message = action.message,
            depends_on_action_id = action.dependsOnActionId,
            updated_at = action.updatedAt,
        )
    }

    private fun Consolidation_plan.toDomain() = ConsolidationPlan(
        id = id,
        destinationRoot = destination_root,
        layoutStrategy = LayoutStrategyKind.valueOf(layout_strategy),
        conflictPolicy = ConflictPolicyKind.valueOf(conflict_policy),
        removeRedundantExact = remove_redundant_exact != 0L,
        status = PlanStatus.valueOf(status),
        createdAt = created_at,
    )

    private fun Consolidation_action.toDomain() = ConsolidationAction(
        id = id,
        planId = plan_id,
        fileId = file_id,
        sourcePath = source_path,
        destinationPath = destination_path,
        kind = ActionKind.valueOf(kind),
        state = ActionState.valueOf(state),
        message = message,
        dependsOnActionId = depends_on_action_id,
        updatedAt = updated_at,
    )
}

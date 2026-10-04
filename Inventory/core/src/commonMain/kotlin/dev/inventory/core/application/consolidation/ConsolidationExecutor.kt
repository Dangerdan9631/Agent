package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.PlanStatus
import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.port.Clock
import dev.inventory.core.port.ConsolidationRepository
import dev.inventory.core.port.ContentHasher
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileSystemPort
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Executes a plan's journal: copy to a temporary file, verify the hash, rename into place, then delete the source.
 */
class ConsolidationExecutor(
    private val plans: ConsolidationRepository,
    private val files: FileEntryRepository,
    private val decisions: FileDecisionRepository,
    private val fileSystem: FileSystemPort,
    private val hasher: ContentHasher,
    private val clock: Clock,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Returns a cold flow that processes every actionable row of the plan when collected, emitting progress after each action; cancelling leaves the plan PAUSED and resumable.
     */
    fun execute(planId: Long): Flow<ExecutionProgress> = flow {
        val plan = requireNotNull(plans.plan(planId)) { "Plan $planId does not exist" }
        plans.updateStatus(planId, PlanStatus.RUNNING)
        logger.info { "Executing plan $planId into ${plan.destinationRoot}" }
        val counts = plans.countsByState(planId).toMutableMap()
        emit(ExecutionProgress(counts.toMap(), "", "Starting"))
        try {
            while (true) {
                val batch = plans.nextActionable(planId, BATCH)
                if (batch.isEmpty()) break
                for (action in batch) {
                    val before = action.state
                    val after = process(action)
                    counts[before] = (counts[before] ?: 1L) - 1
                    counts[after] = (counts[after] ?: 0L) + 1
                    emit(ExecutionProgress(counts.toMap(), action.sourcePath, phaseFor(action.kind)))
                }
            }
            plans.updateStatus(planId, PlanStatus.COMPLETED)
            logger.info { "Plan $planId completed: $counts" }
            emit(ExecutionProgress(counts.toMap(), "", "Completed"))
        } catch (e: CancellationException) {
            plans.updateStatus(planId, PlanStatus.PAUSED)
            logger.info { "Plan $planId paused by cancellation: $counts" }
            throw e
        }
    }

    private suspend fun process(action: ConsolidationAction): ActionState = when (action.kind) {
        ActionKind.SKIP -> transition(action, ActionState.SKIPPED, action.message)
        ActionKind.MOVE -> processMove(action)
        ActionKind.DELETE_REDUNDANT -> processDelete(action)
    }

    private suspend fun processMove(action: ConsolidationAction): ActionState {
        val destination = action.destinationPath ?: return fail(action, "Move action has no destination")
        val temporary = fileSystem.temporaryPathFor(destination)
        var state = action.state
        try {
            if (state == ActionState.COPIED && !fileSystem.exists(temporary)) state = ActionState.PENDING
            if (state == ActionState.PENDING) {
                if (!fileSystem.exists(action.sourcePath)) return fail(action, "Source file is missing")
                if (fileSystem.exists(destination)) return fail(action, "Destination already exists")
                fileSystem.copyToTemporary(action.sourcePath, destination)
                state = transition(action, ActionState.COPIED, null)
            }
            if (state == ActionState.COPIED) {
                val expected = sourceHash(action)
                val actual = hasher.fullHash(temporary)
                if (expected != actual) {
                    fileSystem.deleteFile(temporary)
                    return fail(action, "Hash mismatch after copy (expected $expected, got $actual); source left untouched")
                }
                if (fileSystem.exists(destination)) return fail(action, "Destination appeared during copy")
                fileSystem.moveIntoPlace(temporary, destination)
                state = transition(action, ActionState.VERIFIED, null)
            }
            if (state == ActionState.VERIFIED) {
                fileSystem.deleteFile(action.sourcePath)
                files.markMissing(action.fileId)
                state = transition(action, ActionState.SOURCE_DELETED, null)
            }
            return state
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.warn(e) { "Move failed for ${action.sourcePath}" }
            return fail(action, e.message ?: e::class.simpleName ?: "error")
        }
    }

    private suspend fun processDelete(action: ConsolidationAction): ActionState {
        val dependencyId = action.dependsOnActionId ?: return fail(action, "Redundant delete has no keeper action")
        val dependency = plans.action(dependencyId) ?: return fail(action, "Keeper action $dependencyId not found")
        if (dependency.state != ActionState.VERIFIED && dependency.state != ActionState.SOURCE_DELETED) {
            return fail(action, "Keeper was not verified at the destination (${dependency.state}); nothing deleted")
        }
        try {
            if (!fileSystem.exists(action.sourcePath)) return transition(action, ActionState.SKIPPED, "Source already gone")
            val keeper = files.byId(dependency.fileId)
            val keeperHash = keeper?.fullHash
            val ownHash = sourceHash(action)
            val explicitDiscard = decisions.forFiles(listOf(action.fileId))[action.fileId]?.decision == Decision.DISCARD
            if (keeperHash != ownHash && !explicitDiscard) {
                return fail(action, "Content differs from keeper and no explicit DISCARD decision exists; nothing deleted")
            }
            fileSystem.deleteFile(action.sourcePath)
            files.markMissing(action.fileId)
            return transition(action, ActionState.SOURCE_DELETED, null)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.warn(e) { "Redundant delete failed for ${action.sourcePath}" }
            return fail(action, e.message ?: e::class.simpleName ?: "error")
        }
    }

    private suspend fun sourceHash(action: ConsolidationAction): String {
        val file = files.byId(action.fileId)
        file?.fullHash?.let { return it }
        val computed = hasher.fullHash(action.sourcePath)
        if (file != null) files.updateFullHash(file.id, computed)
        return computed
    }

    private suspend fun transition(action: ConsolidationAction, state: ActionState, message: String?): ActionState {
        plans.updateActionState(action.id, state, message, clock.now())
        return state
    }

    private suspend fun fail(action: ConsolidationAction, message: String): ActionState {
        logger.warn { "Action ${action.id} (${action.kind}) failed: $message" }
        return transition(action, ActionState.FAILED, message)
    }

    private fun phaseFor(kind: ActionKind): String = when (kind) {
        ActionKind.MOVE -> "Moving"
        ActionKind.DELETE_REDUNDANT -> "Removing redundant copies"
        ActionKind.SKIP -> "Skipping"
    }

    private companion object {
        const val BATCH = 100
    }
}

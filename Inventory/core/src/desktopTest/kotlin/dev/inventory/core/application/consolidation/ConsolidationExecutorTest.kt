package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.domain.consolidation.PlanStatus
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.FixedClock
import dev.inventory.core.support.InMemoryConsolidationRepository
import dev.inventory.core.support.InMemoryFileDecisionRepository
import dev.inventory.core.support.InMemoryFileEntryRepository
import dev.inventory.core.support.InMemoryFileSystem
import dev.inventory.core.support.ScriptedContentHasher
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * Verifies the journaled move never deletes an unverified source and can resume from COPIED.
 */
class ConsolidationExecutorTest {
    private val files = InMemoryFileEntryRepository()
    private val decisions = InMemoryFileDecisionRepository()
    private val plans = InMemoryConsolidationRepository()
    private val fileSystem = InMemoryFileSystem()
    private val hasher = ScriptedContentHasher()
    private val clock = FixedClock(5_000L)
    private val executor = ConsolidationExecutor(plans, files, decisions, fileSystem, hasher, clock)
    private val entries = FileEntries()

    @Test
    fun hashMismatchLeavesTheSourceUntouched() = runTest {
        files.put(entries.create(id = 1, relativePath = "notes.txt", fullHash = "good"))
        fileSystem.putFile("/src/notes.txt", "hello".encodeToByteArray())
        hasher.set("/src/notes.txt", "good")
        hasher.set("/dst/notes.txt.inventory-tmp", "bad")
        val plan = plans.createPlan(ConsolidationPlan(0, "/dst", LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.SKIP, false, PlanStatus.DRAFT, 1))
        plans.insertAction(
            ConsolidationAction(0, plan.id, 1, "/src/notes.txt", "/dst/notes.txt", ActionKind.MOVE, ActionState.PENDING, null, null, 1),
        )

        executor.execute(plan.id).toList()

        val action = plans.actions(plan.id, null, 10, 0).single()
        assertEquals(ActionState.FAILED, action.state)
        assertNotNull(fileSystem.bytes("/src/notes.txt"))
        assertNull(fileSystem.bytes("/dst/notes.txt"))
        assertNull(fileSystem.bytes("/dst/notes.txt.inventory-tmp"))
    }

    @Test
    fun resumeFromCopiedVerifiesAndDeletesTheSource() = runTest {
        files.put(entries.create(id = 1, relativePath = "notes.txt", fullHash = "good"))
        fileSystem.putFile("/src/notes.txt", "hello".encodeToByteArray())
        fileSystem.putFile("/dst/notes.txt.inventory-tmp", "hello".encodeToByteArray())
        hasher.set("/src/notes.txt", "good")
        hasher.set("/dst/notes.txt.inventory-tmp", "good")
        val plan = plans.createPlan(ConsolidationPlan(0, "/dst", LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.SKIP, false, PlanStatus.DRAFT, 1))
        plans.insertAction(
            ConsolidationAction(0, plan.id, 1, "/src/notes.txt", "/dst/notes.txt", ActionKind.MOVE, ActionState.COPIED, null, null, 1),
        )

        executor.execute(plan.id).toList()

        val action = plans.actions(plan.id, null, 10, 0).single()
        assertEquals(ActionState.SOURCE_DELETED, action.state)
        assertEquals(PlanStatus.COMPLETED, plans.plan(plan.id)?.status)
        assertNotNull(fileSystem.bytes("/dst/notes.txt"))
        assertNull(fileSystem.bytes("/src/notes.txt"))
        assertNull(fileSystem.bytes("/dst/notes.txt.inventory-tmp"))
    }
}

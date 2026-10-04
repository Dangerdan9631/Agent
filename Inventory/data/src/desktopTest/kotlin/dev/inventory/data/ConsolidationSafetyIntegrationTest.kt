package dev.inventory.data

import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.domain.consolidation.PlanStatus
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.data.hashing.Sha256ContentHasher
import dev.inventory.data.support.InventoryHarness
import dev.inventory.data.support.TamperingHasher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

/**
 * Proves a hash mismatch never deletes the source and that a COPIED journal row can be resumed safely.
 */
class ConsolidationSafetyIntegrationTest {
    @TempDir
    lateinit var temp: Path

    @Test
    fun hashMismatchLeavesSourceAndRemovesTemporaryCopy() = runTest {
        val source = temp.resolve("src/notes.txt")
        Files.createDirectories(source.parent)
        Files.writeString(source, "keep me")
        val destination = temp.resolve("dst/notes.txt")
        val hasher = TamperingHasher(Sha256ContentHasher(Dispatchers.IO))

        InventoryHarness(hasher = hasher).use { harness ->
            val volume = harness.volumes.add("Src", source.parent.toString())
            harness.scanner.scan(volume).collect()
            val file = harness.files.presentForVolume(volume.id).single()
            val plan = harness.plans.createPlan(
                ConsolidationPlan(0, destination.parent.toString(), LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.SKIP, false, PlanStatus.DRAFT, harness.clock.now()),
            )
            harness.plans.insertAction(
                ConsolidationAction(0, plan.id, file.id, source.toString(), destination.toString(), ActionKind.MOVE, ActionState.PENDING, null, null, harness.clock.now()),
            )

            harness.consolidation.execute(plan.id).collect()

            val action = harness.plans.actions(plan.id, null, 10, 0).single()
            assertEquals(ActionState.FAILED, action.state)
            assertTrue(Files.exists(source), "source must survive a hash mismatch")
            assertFalse(Files.exists(destination), "final destination must not be created")
            assertFalse(Files.exists(Path.of(destination.toString() + ".inventory-tmp")), "temporary copy must be deleted")
        }
    }

    @Test
    fun resumeFromCopiedCompletesTheMove() = runTest {
        val source = temp.resolve("src/notes.txt")
        val destination = temp.resolve("dst/notes.txt")
        val temporary = Path.of(destination.toString() + ".inventory-tmp")
        Files.createDirectories(source.parent)
        Files.createDirectories(destination.parent)
        Files.writeString(source, "payload")
        Files.writeString(temporary, "payload")

        InventoryHarness().use { harness ->
            val volume = harness.volumes.add("Src", source.parent.toString())
            harness.scanner.scan(volume).collect()
            val file = harness.files.presentForVolume(volume.id).single()
            harness.files.updateFullHash(file.id, harness.hasher.fullHash(source.toString()))
            val plan = harness.plans.createPlan(
                ConsolidationPlan(0, destination.parent.toString(), LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.SKIP, false, PlanStatus.DRAFT, harness.clock.now()),
            )
            harness.plans.insertAction(
                ConsolidationAction(0, plan.id, file.id, source.toString(), destination.toString(), ActionKind.MOVE, ActionState.COPIED, null, null, harness.clock.now()),
            )

            harness.consolidation.execute(plan.id).collect()

            val action = harness.plans.actions(plan.id, null, 10, 0).single()
            assertEquals(ActionState.SOURCE_DELETED, action.state)
            assertEquals(PlanStatus.COMPLETED, harness.plans.plan(plan.id)?.status)
            assertTrue(Files.exists(destination))
            assertEquals("payload", Files.readString(destination))
            assertFalse(Files.exists(source))
            assertFalse(Files.exists(temporary))
            assertEquals(FilePresence.MISSING, harness.files.byId(file.id)?.presence)
            assertEquals(FileKind.DOCUMENT, harness.files.byId(file.id)?.kind)
        }
    }
}

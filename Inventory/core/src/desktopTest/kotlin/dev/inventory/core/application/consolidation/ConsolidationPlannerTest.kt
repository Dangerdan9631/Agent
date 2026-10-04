package dev.inventory.core.application.consolidation

import dev.inventory.core.application.keeper.ShortestPathPolicy
import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.support.EmptyMetadataReader
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.FixedClock
import dev.inventory.core.support.InMemoryConsolidationRepository
import dev.inventory.core.support.InMemoryDuplicateGroupRepository
import dev.inventory.core.support.InMemoryFileDecisionRepository
import dev.inventory.core.support.InMemoryFileEntryRepository
import dev.inventory.core.support.InMemoryFileSystem
import dev.inventory.core.support.InMemoryTagRepository
import dev.inventory.core.support.InMemoryVolumeRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies planning produces MOVE and DELETE_REDUNDANT actions and rejects destinations that overlap scanned roots.
 */
class ConsolidationPlannerTest {
    private val entries = FileEntries()
    private val files = InMemoryFileEntryRepository()
    private val volumes = InMemoryVolumeRepository()
    private val decisions = InMemoryFileDecisionRepository()
    private val groups = InMemoryDuplicateGroupRepository()
    private val tags = InMemoryTagRepository()
    private val plans = InMemoryConsolidationRepository()
    private val fileSystem = InMemoryFileSystem()
    private val clock = FixedClock(1_000L)
    private val planner = ConsolidationPlanner(
        files, volumes, decisions, groups, tags, plans, fileSystem,
        LayoutStrategyFactory(EmptyMetadataReader(), fileSystem),
        ConflictPolicyFactory(),
        ShortestPathPolicy(),
        clock,
    )

    @Test
    fun plansMoveForKeeperAndDeleteForRedundantExactCopies() = runTest {
        volumes.put(Volume(1, "DriveA", "/drive-a", null))
        volumes.put(Volume(2, "DriveB", "/drive-b", null))
        files.put(entries.create(id = 10, volumeId = 1, relativePath = "docs/notes.txt", fullHash = "h"))
        files.put(entries.create(id = 20, volumeId = 2, relativePath = "backup/notes.txt", fullHash = "h"))
        groups.upsert(
            DuplicateGroup(0, DuplicateGroupKind.EXACT, "same-content", 1.0, "EXACT:10,20", 10, ReviewState.OPEN, 1),
            listOf(DuplicateGroupMember(0, 10, 1.0), DuplicateGroupMember(0, 20, 1.0)),
        )

        val plan = planner.plan(
            PlanRequest("/consolidated", LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.RENAME_WITH_SUFFIX, true, emptySet()),
        )
        val actions = plans.actions(plan.id, null, 50, 0)

        assertEquals(1, actions.count { it.kind == ActionKind.MOVE && it.fileId == 10L })
        assertEquals(1, actions.count { it.kind == ActionKind.DELETE_REDUNDANT && it.fileId == 20L })
        val move = actions.single { it.kind == ActionKind.MOVE }
        val delete = actions.single { it.kind == ActionKind.DELETE_REDUNDANT }
        assertEquals(move.id, delete.dependsOnActionId)
        assertEquals("/consolidated/DriveA/docs/notes.txt", move.destinationPath)
    }

    @Test
    fun probableMembersAreNeverAutoDeleted() = runTest {
        volumes.put(Volume(1, "DriveA", "/drive-a", null))
        volumes.put(Volume(2, "DriveB", "/drive-b", null))
        files.put(entries.create(id = 10, volumeId = 1, relativePath = "a.txt"))
        files.put(entries.create(id = 20, volumeId = 2, relativePath = "a.txt"))
        groups.upsert(
            DuplicateGroup(0, DuplicateGroupKind.PROBABLE, "path-twin", 0.6, "PROBABLE:10,20", 10, ReviewState.RESOLVED, 1),
            listOf(DuplicateGroupMember(0, 10, 0.6), DuplicateGroupMember(0, 20, 0.6)),
        )

        val plan = planner.plan(
            PlanRequest("/consolidated", LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.RENAME_WITH_SUFFIX, true, emptySet()),
        )
        val actions = plans.actions(plan.id, null, 50, 0)

        assertTrue(actions.none { it.kind == ActionKind.DELETE_REDUNDANT })
        assertEquals(2, actions.count { it.kind == ActionKind.MOVE })
    }

    @Test
    fun probableDiscardBecomesARedundantDelete() = runTest {
        volumes.put(Volume(1, "DriveA", "/drive-a", null))
        volumes.put(Volume(2, "DriveB", "/drive-b", null))
        files.put(entries.create(id = 10, volumeId = 1, relativePath = "a.txt"))
        files.put(entries.create(id = 20, volumeId = 2, relativePath = "a.txt"))
        groups.upsert(
            DuplicateGroup(0, DuplicateGroupKind.PROBABLE, "path-twin", 0.6, "PROBABLE:10,20", 10, ReviewState.RESOLVED, 1),
            listOf(DuplicateGroupMember(0, 10, 0.6), DuplicateGroupMember(0, 20, 0.6)),
        )
        decisions.set(listOf(20), Decision.DISCARD, null, 1)

        val plan = planner.plan(
            PlanRequest("/consolidated", LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.SKIP, true, emptySet()),
        )
        val actions = plans.actions(plan.id, null, 50, 0)
        assertEquals(1, actions.count { it.kind == ActionKind.DELETE_REDUNDANT && it.fileId == 20L })
    }

    @Test
    fun rejectsDestinationInsideAScannedVolume() = runTest {
        volumes.put(Volume(1, "DriveA", "/drive-a", null))
        val error = runCatching {
            planner.plan(
                PlanRequest("/drive-a/out", LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH, ConflictPolicyKind.SKIP, false, emptySet()),
            )
        }.exceptionOrNull()
        assertTrue(error is IllegalArgumentException)
    }
}

package dev.inventory.core.application.keeper

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.FixedClock
import dev.inventory.core.support.InMemoryDirectoryEntryRepository
import dev.inventory.core.support.InMemoryDuplicateGroupRepository
import dev.inventory.core.support.InMemoryFileDecisionRepository
import dev.inventory.core.support.InMemoryFileEntryRepository
import dev.inventory.core.support.InMemoryVolumeRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies folder resolution writes KEEP and DISCARD for the nested trees and that dismiss clears those decisions.
 */
class GroupResolutionServiceFolderTest {
    private val entries = FileEntries()
    private val files = InMemoryFileEntryRepository()
    private val directories = InMemoryDirectoryEntryRepository()
    private val groups = InMemoryDuplicateGroupRepository()
    private val decisions = InMemoryFileDecisionRepository()
    private val service = GroupResolutionService(
        groups,
        files,
        directories,
        decisions,
        InMemoryVolumeRepository(),
        KeeperPolicyFactory(),
        FixedClock(1),
    )

    @Test
    fun resolveKeepsNestedTreeAndDismissClearsIt() = runTest {
        directories.put(DirectoryEntry(1, 1, "docs", "tree", 2, 20))
        directories.put(DirectoryEntry(2, 2, "backup/docs", "tree", 2, 20))
        files.put(entries.create(id = 10, volumeId = 1, relativePath = "docs/sub/a.txt", fullHash = "aa"))
        files.put(entries.create(id = 20, volumeId = 2, relativePath = "backup/docs/sub/a.txt", fullHash = "aa"))
        files.put(entries.create(id = 11, volumeId = 1, relativePath = "docs/b.txt", fullHash = "bb"))
        files.put(entries.create(id = 21, volumeId = 2, relativePath = "backup/docs/b.txt", fullHash = "bb"))
        files.put(entries.create(id = 31, volumeId = 3, relativePath = "elsewhere/b.txt", fullHash = "bb"))
        files.put(entries.create(id = 99, volumeId = 1, relativePath = "docs-old/a.txt", fullHash = "zz"))

        val folderId = group(DuplicateGroupKind.FOLDER, "folders", 1, 2)
        val nestedId = group(DuplicateGroupKind.EXACT, "nested-file", 10, 20)
        val partialId = group(DuplicateGroupKind.EXACT, "partial-file", 11, 21, 31)

        service.resolve(folderId, 1)

        val recorded = decisions.forFiles(listOf(10, 11, 20, 21, 31, 99))
        assertEquals(Decision.KEEP, recorded[10]?.decision)
        assertEquals("Keeper folder 1", recorded[10]?.note)
        assertEquals(Decision.KEEP, recorded[11]?.decision)
        assertEquals(Decision.DISCARD, recorded[20]?.decision)
        assertEquals("Duplicate of folder 1 file 10", recorded[20]?.note)
        assertEquals(Decision.DISCARD, recorded[21]?.decision)
        assertEquals("Duplicate of folder 1 file 11", recorded[21]?.note)
        assertNull(recorded[31])
        assertNull(recorded[99])

        assertEquals(1L, groups.byId(folderId)?.keeperFileId)
        assertEquals(ReviewState.RESOLVED, groups.byId(folderId)?.reviewState)
        assertEquals(10L, groups.byId(nestedId)?.keeperFileId)
        assertEquals(ReviewState.RESOLVED, groups.byId(nestedId)?.reviewState)
        assertEquals(11L, groups.byId(partialId)?.keeperFileId)
        assertEquals(ReviewState.OPEN, groups.byId(partialId)?.reviewState)

        service.dismiss(folderId)

        assertTrue(decisions.forFiles(listOf(10, 11, 20, 21)).isEmpty())
        assertEquals(ReviewState.DISMISSED, groups.byId(folderId)?.reviewState)
        assertNull(groups.byId(folderId)?.keeperFileId)
        assertEquals(ReviewState.OPEN, groups.byId(nestedId)?.reviewState)
        assertNull(groups.byId(nestedId)?.keeperFileId)
        assertEquals(ReviewState.OPEN, groups.byId(partialId)?.reviewState)
        assertNull(groups.byId(partialId)?.keeperFileId)
    }

    @Test
    fun applyPolicyKeepsShortestFolder() = runTest {
        directories.put(DirectoryEntry(3, 1, "photos/vacation/2020", "tree", 1, 10))
        directories.put(DirectoryEntry(4, 2, "pics", "tree", 1, 10))
        files.put(entries.create(id = 40, volumeId = 1, relativePath = "photos/vacation/2020/a.txt"))
        files.put(entries.create(id = 41, volumeId = 2, relativePath = "pics/a.txt"))
        val folderId = group(DuplicateGroupKind.FOLDER, "shortest", 3, 4)

        val resolved = service.applyPolicy(DuplicateGroupKind.FOLDER, KeeperPolicyKind.SHORTEST_PATH, emptyList())

        assertEquals(1, resolved)
        assertEquals(4L, groups.byId(folderId)?.keeperFileId)
        assertEquals(ReviewState.RESOLVED, groups.byId(folderId)?.reviewState)
        val recorded = decisions.forFiles(listOf(40, 41))
        assertEquals(Decision.DISCARD, recorded[40]?.decision)
        assertEquals(Decision.KEEP, recorded[41]?.decision)
        assertEquals("Keeper folder 4", recorded[41]?.note)
        assertEquals("Duplicate of folder 4 file 41", recorded[40]?.note)
    }

    private suspend fun group(kind: DuplicateGroupKind, key: String, vararg memberIds: Long): Long =
        groups.upsert(
            DuplicateGroup(0, kind, "tree-hash", 0.95, key, null, ReviewState.OPEN, 1),
            memberIds.map { DuplicateGroupMember(0, it, 1.0) },
        ).id
}

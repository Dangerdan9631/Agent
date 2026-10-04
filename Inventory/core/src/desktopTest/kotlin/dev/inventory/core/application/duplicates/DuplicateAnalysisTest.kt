package dev.inventory.core.application.duplicates

import dev.inventory.core.application.directory.DirectoryTreeHasher
import dev.inventory.core.application.duplicates.rules.NameSizeToleranceRule
import dev.inventory.core.application.duplicates.rules.PathTwinRule
import dev.inventory.core.application.duplicates.rules.SameNameAndSizeRule
import dev.inventory.core.application.fingerprint.FingerprintService
import dev.inventory.core.application.fingerprint.FingerprinterRegistry
import dev.inventory.core.application.hashing.FullHashEscalation
import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.ContentFingerprinter
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.FixedClock
import dev.inventory.core.support.HexTextDigest
import dev.inventory.core.support.InMemoryDirectoryEntryRepository
import dev.inventory.core.support.InMemoryDuplicateGroupRepository
import dev.inventory.core.support.InMemoryFileEntryRepository
import dev.inventory.core.support.InMemoryFileSystem
import dev.inventory.core.support.InMemoryVolumeRepository
import dev.inventory.core.support.ScriptedContentHasher
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies groups are stored before later phases finish, that larger groups replace open subsets, and that a running scan is not pruned.
 */
class DuplicateAnalysisTest {
    private val entries = FileEntries()
    private val files = InMemoryFileEntryRepository()
    private val groups = InMemoryDuplicateGroupRepository()
    private val directories = InMemoryDirectoryEntryRepository()
    private val volumes = InMemoryVolumeRepository()
    private val clock = FixedClock(5_000)
    private val hasher = ScriptedContentHasher()

    @Test
    fun savesNameMatchesBeforeFingerprinting() = runTest {
        volumes.put(Volume(1, "Drive", "/drive", null))
        files.insertAll(
            listOf(
                entries.create(id = 1, relativePath = "a/notes.txt", name = "notes.txt", size = 20, kind = FileKind.DOCUMENT),
                entries.create(id = 2, relativePath = "b/notes.txt", name = "notes.txt", size = 20, kind = FileKind.DOCUMENT, volumeId = 1),
            ),
        )
        var fingerprinted = false
        val analysis = analysis(
            object : ContentFingerprinter {
                override val kind = FingerprintKind.NORMALIZED_TEXT
                override fun supports(file: FileEntry) = file.kind == FileKind.DOCUMENT
                override suspend fun fingerprint(path: String): String? {
                    fingerprinted = true
                    assertTrue(groups.allWithMembers(DuplicateGroupKind.PROBABLE).any { it.first.reason == "same-name-size" })
                    return "text"
                }
            },
        )

        analysis.run().collect { }

        assertTrue(fingerprinted)
    }

    @Test
    fun savesExactGroupsBeforeFingerprinting() = runTest {
        volumes.put(Volume(1, "Drive", "/drive", null))
        hasher.set("/drive/a.bin", "same-bytes")
        hasher.set("/drive/b.bin", "same-bytes")
        files.insertAll(
            listOf(
                entries.create(id = 1, relativePath = "a.bin", size = 20, quickHash = "qq", kind = FileKind.DOCUMENT),
                entries.create(id = 2, relativePath = "b.bin", size = 20, quickHash = "qq", kind = FileKind.DOCUMENT),
            ),
        )
        var fingerprinted = false
        val analysis = analysis(
            object : ContentFingerprinter {
                override val kind = FingerprintKind.NORMALIZED_TEXT
                override fun supports(file: FileEntry) = true
                override suspend fun fingerprint(path: String): String? {
                    fingerprinted = true
                    val exact = groups.allWithMembers(DuplicateGroupKind.EXACT)
                    assertEquals(1, exact.size)
                    assertEquals(setOf(1L, 2L), exact.single().second.map { it.memberId }.toSet())
                    return "text"
                }
            },
        )

        analysis.run().collect { }

        assertTrue(fingerprinted)
    }

    @Test
    fun replacesOpenPairWhenALargerGroupIsSaved() = runTest {
        val persister = GroupPersister(groups, clock, runId = 5)
        persister.save(DuplicateCandidate(DuplicateGroupKind.PROBABLE, "same-name-size", 0.7, listOf(1L to 0.7, 2L to 0.7)))
        val pair = groups.openWithMembers(DuplicateGroupKind.PROBABLE).single()
        groups.setResolution(pair.first.id, 1, ReviewState.RESOLVED)
        persister.save(DuplicateCandidate(DuplicateGroupKind.PROBABLE, "same-name-size", 0.7, listOf(1L to 0.7, 2L to 0.7, 3L to 0.7)))

        val open = groups.openWithMembers(DuplicateGroupKind.PROBABLE)
        assertEquals(1, open.size)
        assertEquals(setOf(1L, 2L, 3L), open.single().second.map { it.memberId }.toSet())
        assertEquals(ReviewState.RESOLVED, groups.byId(pair.first.id)?.reviewState)
    }

    @Test
    fun drainsInboxWhileScanIsActiveAndPrunesOnlyAfterItStops() = runTest {
        volumes.put(Volume(1, "Drive", "/drive", null))
        val stale = groups.upsert(
            DuplicateGroup(0, DuplicateGroupKind.PROBABLE, "same-name-size", 0.7, "PROBABLE:80,81", null, ReviewState.OPEN, 1),
            listOf(DuplicateGroupMember(0, 80, 0.7), DuplicateGroupMember(0, 81, 0.7)),
            confirmedRun = 1,
        )
        var scanning = true
        var armed = false
        var sawLiveGroup = false
        val analysis = analysis(
            object : ContentFingerprinter {
                override val kind = FingerprintKind.NORMALIZED_TEXT
                override fun supports(file: FileEntry) = false
                override suspend fun fingerprint(path: String): String? = null
            },
            isScanActive = { scanning },
            onWaitingForScan = {
                if (!armed) {
                    armed = true
                    assertNotNull(groups.byId(stale.id))
                    files.insertAll(
                        listOf(
                            entries.create(id = 3, relativePath = "c/report.txt", name = "report.txt", size = 40, kind = FileKind.OTHER),
                            entries.create(id = 4, relativePath = "d/report.txt", name = "report.txt", size = 40, kind = FileKind.OTHER),
                        ),
                    )
                    scanning = false
                }
            },
        )

        analysis.run().collect { progress ->
            val live = groups.allWithMembers(DuplicateGroupKind.PROBABLE).any { (_, members) ->
                members.map { it.memberId }.toSet() == setOf(3L, 4L)
            }
            if (live && progress.phase != "Completed") sawLiveGroup = true
        }

        assertTrue(armed)
        assertTrue(sawLiveGroup)
        assertNull(groups.byId(stale.id))
        assertTrue(
            groups.allWithMembers(DuplicateGroupKind.PROBABLE).any { (_, members) ->
                members.map { it.memberId }.toSet() == setOf(3L, 4L)
            },
        )
    }

    private fun analysis(
        fingerprinter: ContentFingerprinter,
        isScanActive: () -> Boolean = { false },
        onWaitingForScan: suspend () -> Unit = {},
    ) = DuplicateAnalysis(
        fullHashEscalation = FullHashEscalation(files, volumes, InMemoryFileSystem(), hasher),
        fingerprintService = FingerprintService(files, volumes, InMemoryFileSystem(), FingerprinterRegistry(listOf(fingerprinter))),
        treeHasher = DirectoryTreeHasher(files, directories, HexTextDigest()),
        exactDetector = ExactDuplicateDetector(files),
        probableDetector = ProbableDuplicateDetector(
            listOf(SameNameAndSizeRule(files), PathTwinRule(files), NameSizeToleranceRule(files)),
        ),
        folderDetector = FolderDuplicateDetector(directories),
        groups = groups,
        files = files,
        volumes = volumes,
        clock = clock,
        isScanActive = isScanActive,
        pollDelayMillis = 20,
        onWaitingForScan = onWaitingForScan,
    )
}

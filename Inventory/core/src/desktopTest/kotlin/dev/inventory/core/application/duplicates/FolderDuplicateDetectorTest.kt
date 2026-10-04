package dev.inventory.core.application.duplicates

import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.support.InMemoryDirectoryEntryRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies folder groups form on shared tree hashes and omit nested directories whose parents already match.
 */
class FolderDuplicateDetectorTest {
    private val directories = InMemoryDirectoryEntryRepository()
    private val detector = FolderDuplicateDetector(directories)

    @Test
    fun reportsOutermostMatchingDirectories() = runTest {
        directories.put(DirectoryEntry(1, 1, "docs", "tree-a", 2, 10))
        directories.put(DirectoryEntry(2, 2, "docs", "tree-a", 2, 10))
        directories.put(DirectoryEntry(3, 1, "docs/inner", "tree-b", 1, 5))
        directories.put(DirectoryEntry(4, 2, "docs/inner", "tree-b", 1, 5))

        val groups = detector.detect()

        assertEquals(1, groups.size)
        assertEquals("tree-hash", groups.single().reason)
        assertEquals(setOf(1L, 2L), groups.single().members.map { it.first }.toSet())
    }

    @Test
    fun ignoresUniqueTreeHashes() = runTest {
        directories.put(DirectoryEntry(1, 1, "only", "unique", 1, 1))
        assertTrue(detector.detect().isEmpty())
    }
}

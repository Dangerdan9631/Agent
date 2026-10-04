package dev.inventory.core.application.duplicates

import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.InMemoryFileEntryRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies exact groups are formed only from shared full hashes of present files.
 */
class ExactDuplicateDetectorTest {
    private val entries = FileEntries()
    private val files = InMemoryFileEntryRepository()
    private val detector = ExactDuplicateDetector(files)

    @Test
    fun groupsFilesThatShareAFullHash() = runTest {
        files.put(entries.create(id = 1, relativePath = "a/photo.jpg", fullHash = "aaa"))
        files.put(entries.create(id = 2, relativePath = "b/photo.jpg", fullHash = "aaa", volumeId = 2))
        files.put(entries.create(id = 3, relativePath = "unique.txt", fullHash = "bbb"))

        val groups = detector.detect()

        assertEquals(1, groups.size)
        assertEquals("same-content", groups.single().reason)
        assertEquals(setOf(1L, 2L), groups.single().members.map { it.first }.toSet())
        assertEquals(1.0, groups.single().confidence)
    }

    @Test
    fun ignoresFilesWithoutASharedHash() = runTest {
        files.put(entries.create(id = 1, relativePath = "alone.txt", fullHash = "aaa"))
        assertTrue(detector.detect().isEmpty())
    }
}

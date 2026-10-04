package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.InMemoryFileEntryRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies the name, path, and size-tolerance probable rules propose the expected groups.
 */
class ProbableMatchRuleTest {
    private val entries = FileEntries()
    private val files = InMemoryFileEntryRepository()

    @Test
    fun sameNameAndSizeIgnoresKnownExactContent() = runTest {
        files.put(entries.create(id = 1, relativePath = "a/notes.txt", size = 100, fullHash = "same"))
        files.put(entries.create(id = 2, relativePath = "b/notes.txt", size = 100, fullHash = "same", volumeId = 2))
        files.put(entries.create(id = 3, relativePath = "c/report.doc", size = 50, name = "twin.doc"))
        files.put(entries.create(id = 4, relativePath = "d/report.doc", size = 50, name = "twin.doc", volumeId = 2))

        val groups = SameNameAndSizeRule(files).candidates()

        assertEquals(1, groups.size)
        assertEquals("same-name-size", groups.single().reason)
        assertEquals(setOf(3L, 4L), groups.single().members.map { it.first }.toSet())
    }

    @Test
    fun pathTwinFindsEditedCopiesAtTheSameRelativePath() = runTest {
        files.put(entries.create(id = 1, relativePath = "docs/readme.md", size = 10, quickHash = "q1"))
        files.put(entries.create(id = 2, relativePath = "docs/readme.md", size = 12, quickHash = "q2", volumeId = 2))
        files.put(entries.create(id = 3, relativePath = "docs/same.md", size = 8, quickHash = "q3"))
        files.put(entries.create(id = 4, relativePath = "docs/same.md", size = 8, quickHash = "q3", volumeId = 2))

        val groups = PathTwinRule(files).candidates()

        assertEquals(1, groups.size)
        assertEquals("path-twin", groups.single().reason)
        assertEquals(setOf(1L, 2L), groups.single().members.map { it.first }.toSet())
    }

    @Test
    fun nameSizeToleranceRequiresSizeAndTimeDifference() = runTest {
        files.put(entries.create(id = 1, relativePath = "a/song.mp3", size = 1000, modifiedAt = 1, name = "song.mp3"))
        files.put(entries.create(id = 2, relativePath = "b/song.mp3", size = 1050, modifiedAt = 2, name = "song.mp3", volumeId = 2))
        files.put(entries.create(id = 3, relativePath = "c/other.mp3", size = 1000, modifiedAt = 1, name = "other.mp3"))
        files.put(entries.create(id = 4, relativePath = "d/other.mp3", size = 1000, modifiedAt = 9, name = "other.mp3", volumeId = 2))

        val groups = NameSizeToleranceRule(files).candidates()

        assertEquals(1, groups.size)
        assertEquals(setOf(1L, 2L), groups.single().members.map { it.first }.toSet())
    }

    @Test
    fun missingFilesAreIgnored() = runTest {
        files.put(entries.create(id = 1, relativePath = "gone.txt", size = 10, presence = FilePresence.MISSING))
        files.put(entries.create(id = 2, relativePath = "gone.txt", size = 10, volumeId = 2))
        assertTrue(SameNameAndSizeRule(files).candidates().isEmpty())
    }
}

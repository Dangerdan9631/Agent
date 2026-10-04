package dev.inventory.core.support

import dev.inventory.core.port.DirectChildrenResolver
import dev.inventory.core.port.FileQuery
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies directChildren lists immediate folders and files under a volume root or directory.
 */
class DirectChildrenTest {
    private val entries = FileEntries()
    private val files = InMemoryFileEntryRepository()

    @Test
    fun listsRootFilesAndTopLevelFolders() = runTest {
        files.put(entries.create(id = 1, relativePath = "readme.txt"))
        files.put(entries.create(id = 2, relativePath = "docs/guide.txt"))
        files.put(entries.create(id = 3, relativePath = "docs/deep/nested.txt"))

        val root = files.directChildren(1, "", FileQuery())

        assertEquals(listOf("docs"), root.folders.map { it.name })
        assertEquals(listOf("readme.txt"), root.files.map { it.name })

        val docs = files.directChildren(1, "docs", FileQuery())
        assertEquals(listOf("deep"), docs.folders.map { it.name })
        assertEquals(listOf("guide.txt"), docs.files.map { it.name })
    }

    @Test
    fun doesNotTreatDocsOldAsUnderDocs() = runTest {
        files.put(entries.create(id = 1, relativePath = "docs/a.txt"))
        files.put(entries.create(id = 2, relativePath = "docs-old/b.txt"))

        val underDocs = files.directChildren(1, "docs", FileQuery())

        assertTrue(underDocs.folders.isEmpty())
        assertEquals(listOf("a.txt"), underDocs.files.map { it.name })
    }

    @Test
    fun showsAncestorFolderWhenFilterMatchesOnlyDeepFile() = runTest {
        files.put(entries.create(id = 1, relativePath = "docs/guide.txt", extension = "txt"))
        files.put(entries.create(id = 2, relativePath = "docs/readme.pdf", extension = "pdf"))

        val filtered = files.directChildren(1, "", FileQuery(extension = "txt"))

        assertEquals(listOf("docs"), filtered.folders.map { it.name })
        assertTrue(filtered.files.isEmpty())
    }
}

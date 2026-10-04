package dev.inventory.core.application.directory

import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.HexTextDigest
import dev.inventory.core.support.InMemoryDirectoryEntryRepository
import dev.inventory.core.support.InMemoryFileEntryRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies Merkle tree hashes are identical for identical trees and omitted when a file hash is missing.
 */
class DirectoryTreeHasherTest {
    @Test
    fun identicalTreesShareAHash() = runTest {
        val entries = FileEntries()
        val files = InMemoryFileEntryRepository()
        val directories = InMemoryDirectoryEntryRepository()
        files.put(entries.create(id = 1, volumeId = 1, relativePath = "docs/a.txt", size = 4, fullHash = "aa"))
        files.put(entries.create(id = 2, volumeId = 1, relativePath = "docs/b.txt", size = 5, fullHash = "bb"))
        files.put(entries.create(id = 3, volumeId = 2, relativePath = "docs/a.txt", size = 4, fullHash = "aa"))
        files.put(entries.create(id = 4, volumeId = 2, relativePath = "docs/b.txt", size = 5, fullHash = "bb"))
        val hasher = DirectoryTreeHasher(files, directories, HexTextDigest())

        hasher.rebuild(1)
        hasher.rebuild(2)

        val docs = directories.withSharedTreeHash().filter { it.relativePath == "docs" }
        assertEquals(2, docs.size)
        assertNotNull(docs.first().treeHash)
        assertEquals(docs[0].treeHash, docs[1].treeHash)
    }

    @Test
    fun incompleteHashesAreNotShared() = runTest {
        val entries = FileEntries()
        val files = InMemoryFileEntryRepository()
        val directories = InMemoryDirectoryEntryRepository()
        files.put(entries.create(id = 1, relativePath = "docs/a.txt", fullHash = null, quickHash = null))
        DirectoryTreeHasher(files, directories, HexTextDigest()).rebuild(1)
        assertTrue(directories.withSharedTreeHash().isEmpty())
    }
}

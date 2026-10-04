package dev.inventory.core.support

import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.port.DirectoryEntryRepository

/**
 * In-memory DirectoryEntryRepository used by core unit tests.
 */
class InMemoryDirectoryEntryRepository : DirectoryEntryRepository {
    private val rows = LinkedHashMap<Long, DirectoryEntry>()
    private var nextId = 1L

    /**
     * Stores the directory, assigning an identifier when id is 0, and returns the stored row.
     */
    fun put(entry: DirectoryEntry): DirectoryEntry {
        val stored = if (entry.id == 0L) entry.copy(id = nextId++) else entry
        if (stored.id >= nextId) nextId = stored.id + 1
        rows[stored.id] = stored
        return stored
    }

    override suspend fun replaceForVolume(volumeId: Long, entries: List<DirectoryEntry>) {
        rows.values.filter { it.volumeId == volumeId }.forEach { rows.remove(it.id) }
        entries.forEach { put(it.copy(id = 0, volumeId = volumeId)) }
    }

    override suspend fun withSharedTreeHash(): List<DirectoryEntry> =
        rows.values.groupBy { it.treeHash }.filter { (hash, group) -> hash != null && group.size > 1 }.values.flatten()

    override suspend fun forEachSharedTreeHash(onGroup: suspend (List<DirectoryEntry>) -> Unit) {
        rows.values.groupBy { it.treeHash }.filter { (hash, group) -> hash != null && group.size > 1 }.values
            .forEach { onGroup(it) }
    }

    override suspend fun byIds(ids: Collection<Long>): List<DirectoryEntry> = ids.mapNotNull { rows[it] }
}

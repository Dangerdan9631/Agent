package dev.inventory.data.repository

import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.port.DirectoryEntryRepository
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.Directory_entry
import dev.inventory.data.db.InventoryDatabase

/**
 * DirectoryEntryRepository backed by the SQLDelight directory_entry table.
 */
class SqlDelightDirectoryEntryRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : DirectoryEntryRepository {
    private val queries get() = database.directoryEntryQueries

    override suspend fun replaceForVolume(volumeId: Long, entries: List<DirectoryEntry>) = executor.run {
        database.transaction {
            queries.deleteForVolume(volumeId)
            entries.forEach { d ->
                queries.insertDirectory(volumeId, d.relativePath, d.treeHash, d.fileCount, d.byteCount)
            }
        }
    }

    override suspend fun withSharedTreeHash(): List<DirectoryEntry> =
        executor.run { queries.selectWithSharedTreeHash().executeAsList().map { it.toDomain() } }

    override suspend fun forEachSharedTreeHash(onGroup: suspend (List<DirectoryEntry>) -> Unit) {
        var after = ""
        while (true) {
            val keys = executor.run { queries.selectSharedTreeHashKeys(after, PAGE).executeAsList() }
            if (keys.isEmpty()) break
            for (key in keys) {
                val members = executor.run { queries.selectByTreeHash(key).executeAsList().map { it.toDomain() } }
                if (members.size > 1) onGroup(members)
            }
            after = keys.last()
            if (keys.size < PAGE.toInt()) break
        }
    }

    override suspend fun byIds(ids: Collection<Long>): List<DirectoryEntry> = executor.run {
        ids.chunked(500).flatMap { chunk -> queries.selectByIds(chunk).executeAsList().map { it.toDomain() } }
    }

    private fun Directory_entry.toDomain() = DirectoryEntry(id, volume_id, relative_path, tree_hash, file_count, byte_count)

    private companion object {
        const val PAGE = 200L
    }
}

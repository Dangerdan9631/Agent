package dev.inventory.data.repository

import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.port.TagRepository
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.InventoryDatabase
import dev.inventory.data.db.Tag as TagRow

/**
 * TagRepository backed by the SQLDelight tag and file_tag tables.
 */
class SqlDelightTagRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : TagRepository {
    private val queries get() = database.tagQueries

    override suspend fun all(): List<Tag> = executor.run { queries.selectAll().executeAsList().map { it.toDomain() } }

    override suspend fun create(name: String, color: Int): Tag = executor.run {
        database.transactionWithResult {
            queries.insertTag(name.trim(), color.toLong())
            Tag(queries.lastInsertedId().executeAsOne(), name.trim(), color)
        }
    }

    override suspend fun update(id: Long, name: String, color: Int) =
        executor.run { queries.updateTag(name.trim(), color.toLong(), id); Unit }

    override suspend fun delete(id: Long) = executor.run { queries.deleteTag(id); Unit }

    override suspend fun tagsForFiles(fileIds: Collection<Long>): Map<Long, List<Tag>> = executor.run {
        val result = HashMap<Long, MutableList<Tag>>()
        fileIds.chunked(500).forEach { chunk ->
            queries.selectTagsForFiles(chunk) { fileId, id, name, color ->
                result.getOrPut(fileId) { mutableListOf() } += Tag(id, name, color.toInt())
            }.executeAsList()
        }
        result
    }

    override suspend fun attach(fileIds: Collection<Long>, tagId: Long) = executor.run {
        database.transaction { fileIds.forEach { queries.attach(it, tagId) } }
    }

    override suspend fun detach(fileIds: Collection<Long>, tagId: Long) = executor.run {
        database.transaction { fileIds.forEach { queries.detach(it, tagId) } }
    }

    private fun TagRow.toDomain() = Tag(id, name, color.toInt())
}

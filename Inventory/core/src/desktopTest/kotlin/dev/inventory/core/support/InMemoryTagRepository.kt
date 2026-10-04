package dev.inventory.core.support

import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.port.TagRepository

/**
 * In-memory TagRepository used by core unit tests.
 */
class InMemoryTagRepository : TagRepository {
    private val tags = LinkedHashMap<Long, Tag>()
    private val attachments = HashMap<Long, MutableSet<Long>>()
    private var nextId = 1L

    override suspend fun all(): List<Tag> = tags.values.sortedBy { it.name }

    override suspend fun create(name: String, color: Int): Tag {
        val tag = Tag(nextId++, name, color)
        tags[tag.id] = tag
        return tag
    }

    override suspend fun update(id: Long, name: String, color: Int) {
        tags[id] = Tag(id, name, color)
    }

    override suspend fun delete(id: Long) {
        tags.remove(id)
        attachments.values.forEach { it.remove(id) }
    }

    override suspend fun tagsForFiles(fileIds: Collection<Long>): Map<Long, List<Tag>> =
        fileIds.mapNotNull { fileId ->
            val assigned = attachments[fileId].orEmpty().mapNotNull { tags[it] }
            if (assigned.isEmpty()) null else fileId to assigned
        }.toMap()

    override suspend fun attach(fileIds: Collection<Long>, tagId: Long) {
        fileIds.forEach { attachments.getOrPut(it) { HashSet() }.add(tagId) }
    }

    override suspend fun detach(fileIds: Collection<Long>, tagId: Long) {
        fileIds.forEach { attachments[it]?.remove(tagId) }
    }
}

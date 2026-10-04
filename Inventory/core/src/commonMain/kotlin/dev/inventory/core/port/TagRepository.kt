package dev.inventory.core.port

import dev.inventory.core.domain.tag.Tag

/**
 * Persistence for tags and file-tag assignments.
 */
interface TagRepository {
    /**
     * Returns every tag ordered by name.
     */
    suspend fun all(): List<Tag>

    /**
     * Creates a tag and returns it with its identifier; the name must be unique ignoring case.
     */
    suspend fun create(name: String, color: Int): Tag

    /**
     * Changes a tag's name and color.
     */
    suspend fun update(id: Long, name: String, color: Int)

    /**
     * Deletes the tag and all of its assignments.
     */
    suspend fun delete(id: Long)

    /**
     * Returns the tags attached to each of the given files, omitting files with no tags.
     */
    suspend fun tagsForFiles(fileIds: Collection<Long>): Map<Long, List<Tag>>

    /**
     * Attaches the tag to every file, ignoring files that already carry it.
     */
    suspend fun attach(fileIds: Collection<Long>, tagId: Long)

    /**
     * Removes the tag from every file.
     */
    suspend fun detach(fileIds: Collection<Long>, tagId: Long)
}

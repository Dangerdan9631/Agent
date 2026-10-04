package dev.inventory.core.port

import dev.inventory.core.domain.file.DirectoryEntry

/**
 * Persistence for directory tree hashes.
 */
interface DirectoryEntryRepository {
    /**
     * Deletes every directory of the volume and inserts the given ones in a single transaction.
     */
    suspend fun replaceForVolume(volumeId: Long, entries: List<DirectoryEntry>)

    /**
     * Returns directories whose tree hash is shared with at least one other directory on any volume.
     */
    suspend fun withSharedTreeHash(): List<DirectoryEntry>

    /**
     * Invokes onGroup once per set of directories that share a tree hash, without retaining every set at once.
     */
    suspend fun forEachSharedTreeHash(onGroup: suspend (List<DirectoryEntry>) -> Unit)

    /**
     * Returns the directories with the given identifiers in no particular order.
     */
    suspend fun byIds(ids: Collection<Long>): List<DirectoryEntry>
}

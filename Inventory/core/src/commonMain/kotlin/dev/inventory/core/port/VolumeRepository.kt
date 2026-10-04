package dev.inventory.core.port

import dev.inventory.core.domain.volume.Volume

/**
 * Persistence for registered volumes.
 */
interface VolumeRepository {
    /**
     * Inserts a new volume and returns it with its assigned identifier.
     */
    suspend fun add(label: String, rootPath: String): Volume

    /**
     * Returns every volume ordered by label.
     */
    suspend fun all(): List<Volume>

    /**
     * Returns the volume with the given identifier, or null.
     */
    suspend fun byId(id: Long): Volume?

    /**
     * Changes the display label of a volume.
     */
    suspend fun rename(id: Long, label: String)

    /**
     * Records the completion time of the most recent scan.
     */
    suspend fun markScanned(id: Long, at: Long)

    /**
     * Deletes the volume and every inventory row that references it.
     */
    suspend fun delete(id: Long)
}

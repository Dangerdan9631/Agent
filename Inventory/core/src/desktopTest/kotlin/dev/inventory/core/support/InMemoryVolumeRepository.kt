package dev.inventory.core.support

import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.VolumeRepository

/**
 * In-memory VolumeRepository used by core unit tests.
 */
class InMemoryVolumeRepository : VolumeRepository {
    private val rows = LinkedHashMap<Long, Volume>()
    private var nextId = 1L

    /**
     * Stores the volume, assigning an identifier when id is 0, and returns the stored row.
     */
    fun put(volume: Volume): Volume {
        val stored = if (volume.id == 0L) volume.copy(id = nextId++) else volume
        if (stored.id >= nextId) nextId = stored.id + 1
        rows[stored.id] = stored
        return stored
    }

    override suspend fun add(label: String, rootPath: String): Volume = put(Volume(0, label, rootPath, null))

    override suspend fun all(): List<Volume> = rows.values.sortedBy { it.label }

    override suspend fun byId(id: Long): Volume? = rows[id]

    override suspend fun rename(id: Long, label: String) {
        rows[id]?.let { rows[id] = it.copy(label = label) }
    }

    override suspend fun markScanned(id: Long, at: Long) {
        rows[id]?.let { rows[id] = it.copy(lastScanAt = at) }
    }

    override suspend fun delete(id: Long) {
        rows.remove(id)
    }
}

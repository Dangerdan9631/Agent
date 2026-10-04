package dev.inventory.data.repository

import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.VolumeRepository
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.InventoryDatabase
import dev.inventory.data.db.Volume as VolumeRow

/**
 * VolumeRepository backed by the SQLDelight volume table.
 */
class SqlDelightVolumeRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : VolumeRepository {
    private val queries get() = database.volumeQueries

    override suspend fun add(label: String, rootPath: String): Volume = executor.run {
        database.transactionWithResult {
            queries.insertVolume(label, rootPath)
            val id = queries.lastInsertedId().executeAsOne()
            Volume(id, label, rootPath, null)
        }
    }

    override suspend fun all(): List<Volume> = executor.run { queries.selectAll().executeAsList().map { it.toDomain() } }

    override suspend fun byId(id: Long): Volume? = executor.run { queries.selectById(id).executeAsOneOrNull()?.toDomain() }

    override suspend fun rename(id: Long, label: String) = executor.run { queries.updateLabel(label, id); Unit }

    override suspend fun markScanned(id: Long, at: Long) = executor.run { queries.updateLastScanAt(at, id); Unit }

    override suspend fun delete(id: Long) = executor.run { queries.deleteById(id); Unit }

    private fun VolumeRow.toDomain() = Volume(id, label, root_path, last_scan_at)
}

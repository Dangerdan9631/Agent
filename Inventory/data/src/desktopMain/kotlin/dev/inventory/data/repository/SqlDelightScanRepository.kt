package dev.inventory.data.repository

import dev.inventory.core.domain.volume.Scan
import dev.inventory.core.domain.volume.ScanStatus
import dev.inventory.core.port.ScanRepository
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.InventoryDatabase
import dev.inventory.data.db.Scan as ScanRow

/**
 * ScanRepository backed by the SQLDelight scan table.
 */
class SqlDelightScanRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : ScanRepository {
    private val queries get() = database.scanQueries

    override suspend fun start(volumeId: Long, startedAt: Long): Scan = executor.run {
        database.transactionWithResult {
            queries.insertScan(volumeId, startedAt)
            val id = queries.lastInsertedId().executeAsOne()
            Scan(id, volumeId, startedAt, null, ScanStatus.RUNNING, 0, 0, 0, 0, 0, null)
        }
    }

    override suspend fun finish(scan: Scan) = executor.run {
        queries.finishScan(
            finished_at = scan.finishedAt,
            status = scan.status.name,
            file_count = scan.fileCount,
            byte_count = scan.byteCount,
            new_count = scan.newCount,
            changed_count = scan.changedCount,
            missing_count = scan.missingCount,
            error = scan.error,
            id = scan.id,
        )
        Unit
    }

    override suspend fun forVolume(volumeId: Long): List<Scan> =
        executor.run { queries.selectForVolume(volumeId).executeAsList().map { it.toDomain() } }

    override suspend fun latestForVolume(volumeId: Long): Scan? =
        executor.run { queries.selectLatestForVolume(volumeId).executeAsOneOrNull()?.toDomain() }

    private fun ScanRow.toDomain() = Scan(
        id = id,
        volumeId = volume_id,
        startedAt = started_at,
        finishedAt = finished_at,
        status = ScanStatus.valueOf(status),
        fileCount = file_count,
        byteCount = byte_count,
        newCount = new_count,
        changedCount = changed_count,
        missingCount = missing_count,
        error = error,
    )
}

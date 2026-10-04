package dev.inventory.core.port

import dev.inventory.core.domain.volume.Scan

/**
 * Persistence for scan history.
 */
interface ScanRepository {
    /**
     * Inserts a RUNNING scan for the volume and returns it with its assigned identifier.
     */
    suspend fun start(volumeId: Long, startedAt: Long): Scan

    /**
     * Writes the final counts, status, and finish time of a scan.
     */
    suspend fun finish(scan: Scan)

    /**
     * Returns the scans of a volume, newest first.
     */
    suspend fun forVolume(volumeId: Long): List<Scan>

    /**
     * Returns the most recent scan of a volume, or null when it has never been scanned.
     */
    suspend fun latestForVolume(volumeId: Long): Scan?
}

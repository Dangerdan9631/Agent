package dev.inventory.core.domain.volume

/**
 * A single scan pass over one volume with the counts observed during that pass.
 */
data class Scan(
    /**
     * Database identifier; 0 for a scan that has not been persisted yet.
     */
    val id: Long,
    /**
     * Volume that was scanned.
     */
    val volumeId: Long,
    /**
     * Epoch milliseconds when the scan started.
     */
    val startedAt: Long,
    /**
     * Epoch milliseconds when the scan finished, or null while running.
     */
    val finishedAt: Long?,
    /**
     * Lifecycle state of the scan.
     */
    val status: ScanStatus,
    /**
     * Number of files seen during the scan.
     */
    val fileCount: Long,
    /**
     * Total size in bytes of the files seen during the scan.
     */
    val byteCount: Long,
    /**
     * Number of files that did not exist in the inventory before this scan.
     */
    val newCount: Long,
    /**
     * Number of files whose size or modified time differed from the previous inventory row.
     */
    val changedCount: Long,
    /**
     * Number of previously known files that were not found during this scan.
     */
    val missingCount: Long,
    /**
     * Human readable failure reason when status is FAILED, otherwise null.
     */
    val error: String?,
)

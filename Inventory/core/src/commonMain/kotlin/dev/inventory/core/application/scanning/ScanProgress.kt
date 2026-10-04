package dev.inventory.core.application.scanning

/**
 * A snapshot of a running scan emitted periodically for progress display.
 */
data class ScanProgress(
    /**
     * Identifier of the scan row being populated.
     */
    val scanId: Long,
    /**
     * Files walked so far.
     */
    val filesSeen: Long,
    /**
     * Bytes represented by the files walked so far.
     */
    val bytesSeen: Long,
    /**
     * Files that did not exist in the inventory before this scan.
     */
    val newFiles: Long,
    /**
     * Files whose size or modified time changed since the last scan.
     */
    val changedFiles: Long,
    /**
     * Files hashed so far during this scan.
     */
    val hashed: Long,
    /**
     * Paths that could not be read.
     */
    val skipped: Long,
    /**
     * Relative path of the most recently processed file, for display.
     */
    val currentPath: String,
    /**
     * Human readable phase such as "Walking" or "Finalizing".
     */
    val phase: String,
)

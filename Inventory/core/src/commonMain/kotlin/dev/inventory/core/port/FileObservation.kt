package dev.inventory.core.port

/**
 * The minimal previously-recorded facts about a file that a scan needs to decide whether it changed.
 */
data class FileObservation(
    /**
     * FileEntry identifier.
     */
    val id: Long,
    /**
     * Recorded size in bytes.
     */
    val size: Long,
    /**
     * Recorded last modified time in epoch milliseconds.
     */
    val modifiedAt: Long,
    /**
     * Recorded quick hash, or null when it was never computed.
     */
    val quickHash: String?,
)

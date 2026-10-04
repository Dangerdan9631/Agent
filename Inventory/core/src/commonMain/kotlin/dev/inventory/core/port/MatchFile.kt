package dev.inventory.core.port

/**
 * The columns duplicate rules need, without the rest of a file row.
 */
data class MatchFile(
    /**
     * FileEntry identifier.
     */
    val id: Long,
    /**
     * Volume the file lives on.
     */
    val volumeId: Long,
    /**
     * Path relative to the volume root.
     */
    val relativePath: String,
    /**
     * File name including extension.
     */
    val name: String,
    /**
     * Size in bytes.
     */
    val size: Long,
    /**
     * Last modified time in epoch milliseconds.
     */
    val modifiedAt: Long,
    /**
     * Sampled quick hash, or null when it was never computed.
     */
    val quickHash: String?,
    /**
     * Full content hash, or null when it has not been computed.
     */
    val fullHash: String?,
    /**
     * Stored fingerprint value, or null.
     */
    val fingerprint: String?,
)

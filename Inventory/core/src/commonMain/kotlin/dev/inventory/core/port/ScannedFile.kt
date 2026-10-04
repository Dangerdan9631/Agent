package dev.inventory.core.port

/**
 * Attributes of one regular file reported by a filesystem walk before any hashing has happened.
 */
data class ScannedFile(
    /**
     * Path relative to the walk root using forward slashes and no leading slash.
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
     * Creation time in epoch milliseconds, or null when the filesystem does not report one.
     */
    val createdAt: Long?,
)

package dev.inventory.core.port

/**
 * The path and hashes of one present file, used to rebuild directory tree hashes without loading a full row.
 */
data class PresentFileContent(
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
     * Full content hash, or null.
     */
    val fullHash: String?,
    /**
     * Sampled quick hash, or null.
     */
    val quickHash: String?,
)

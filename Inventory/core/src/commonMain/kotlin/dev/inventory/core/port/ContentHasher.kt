package dev.inventory.core.port

/**
 * Computes content hashes of files on disk.
 */
interface ContentHasher {
    /**
     * Returns a cheap lowercase-hex hash over the file size and sampled windows of the content at path.
     */
    suspend fun quickHash(path: String, size: Long): String

    /**
     * Returns the lowercase-hex SHA-256 of the entire content at path.
     */
    suspend fun fullHash(path: String): String
}

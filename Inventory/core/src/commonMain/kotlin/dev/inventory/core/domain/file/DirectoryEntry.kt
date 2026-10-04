package dev.inventory.core.domain.file

/**
 * A directory on a volume with a Merkle hash summarizing the names and content hashes of everything beneath it.
 */
data class DirectoryEntry(
    /**
     * Database identifier; 0 for an entry that has not been persisted yet.
     */
    val id: Long,
    /**
     * Volume the directory lives on.
     */
    val volumeId: Long,
    /**
     * Path relative to the volume root using forward slashes; an empty string denotes the root itself.
     */
    val relativePath: String,
    /**
     * SHA-256 over the sorted child names and their hashes as lowercase hex; null until every descendant is hashed.
     */
    val treeHash: String?,
    /**
     * Number of files beneath the directory at any depth.
     */
    val fileCount: Long,
    /**
     * Total size in bytes of the files beneath the directory at any depth.
     */
    val byteCount: Long,
)

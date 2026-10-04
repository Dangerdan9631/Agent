package dev.inventory.core.domain.file

/**
 * One file observed on a volume together with the hashes and fingerprints computed for it so far.
 */
data class FileEntry(
    /**
     * Database identifier; 0 for an entry that has not been persisted yet.
     */
    val id: Long,
    /**
     * Volume the file lives on.
     */
    val volumeId: Long,
    /**
     * Path relative to the volume root using forward slashes and no leading slash.
     */
    val relativePath: String,
    /**
     * File name including extension.
     */
    val name: String,
    /**
     * Lowercase extension without the leading dot, or an empty string when the name has none.
     */
    val extension: String,
    /**
     * Coarse content category derived from the extension.
     */
    val kind: FileKind,
    /**
     * Size in bytes at the time of the last scan.
     */
    val size: Long,
    /**
     * Last modified time in epoch milliseconds at the time of the last scan.
     */
    val modifiedAt: Long,
    /**
     * Creation time in epoch milliseconds if the filesystem reports one, otherwise null.
     */
    val createdAt: Long?,
    /**
     * Cheap sampled hash over size and three 64 KB windows, encoded as lowercase hex; null until computed.
     */
    val quickHash: String?,
    /**
     * SHA-256 of the full content as lowercase hex; null until computed on demand.
     */
    val fullHash: String?,
    /**
     * Type-specific fingerprint value whose format is defined by fingerprintKind; null when not computed.
     */
    val fingerprint: String?,
    /**
     * Algorithm that produced the fingerprint, or null when no fingerprint exists.
     */
    val fingerprintKind: FingerprintKind?,
    /**
     * Whether the file was found during the latest scan of its volume.
     */
    val presence: FilePresence,
    /**
     * Identifier of the most recent scan that observed this file.
     */
    val lastSeenScanId: Long,
) {
    /**
     * Returns the relative path of the directory that contains this file, or an empty string for root-level files.
     */
    val parentPath: String
        get() = relativePath.substringBeforeLast('/', "")
}

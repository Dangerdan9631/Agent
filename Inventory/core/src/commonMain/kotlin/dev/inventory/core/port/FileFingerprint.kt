package dev.inventory.core.port

/**
 * A file identifier paired with its stored fingerprint, used for in-memory similarity comparison.
 */
data class FileFingerprint(
    /**
     * FileEntry identifier.
     */
    val fileId: Long,
    /**
     * Fingerprint value whose format depends on the FingerprintKind it was queried for.
     */
    val fingerprint: String,
)

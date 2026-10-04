package dev.inventory.core.domain.file

/**
 * The algorithm family that produced a file's content fingerprint, which determines how fingerprints are compared.
 */
enum class FingerprintKind {
    /**
     * SHA-256 of text with normalized line endings and trailing whitespace; compared for equality.
     */
    NORMALIZED_TEXT,

    /**
     * 64-bit difference hash of a downscaled grayscale image encoded as 16 hex digits; compared by Hamming distance.
     */
    IMAGE_DHASH,

    /**
     * Normalized artist, title, album, and duration key from audio tags; compared for equality.
     */
    AUDIO_TAGS,

    /**
     * SHA-256 over the sorted list of archive entries (name, size, crc); compared for equality.
     */
    ARCHIVE_CONTENTS,
}

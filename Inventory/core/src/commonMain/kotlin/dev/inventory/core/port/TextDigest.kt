package dev.inventory.core.port

/**
 * Computes a stable cryptographic digest of in-memory text, used to combine child hashes into tree hashes.
 */
interface TextDigest {
    /**
     * Returns the lowercase-hex SHA-256 of the UTF-8 encoding of text.
     */
    fun sha256Hex(text: String): String
}

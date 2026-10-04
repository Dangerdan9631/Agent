package dev.inventory.core.port

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FingerprintKind

/**
 * Produces a type-specific similarity fingerprint for files it understands.
 */
interface ContentFingerprinter {
    /**
     * The fingerprint algorithm this implementation produces.
     */
    val kind: FingerprintKind

    /**
     * Returns true when this fingerprinter can handle the given file based on its kind and extension.
     */
    fun supports(file: FileEntry): Boolean

    /**
     * Returns the fingerprint for the content at the native absolute path, or null when the content cannot be read.
     */
    suspend fun fingerprint(path: String): String?
}

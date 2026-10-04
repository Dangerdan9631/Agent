package dev.inventory.core.support

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.domain.file.FingerprintKind

/**
 * Builds FileEntry instances for tests with sensible defaults.
 */
class FileEntries {
    /**
     * Returns a present file whose name and extension are derived from relativePath unless overridden.
     */
    fun create(
        id: Long,
        volumeId: Long = 1,
        relativePath: String,
        size: Long = 10,
        modifiedAt: Long = 1_000,
        quickHash: String? = null,
        fullHash: String? = null,
        fingerprint: String? = null,
        fingerprintKind: FingerprintKind? = null,
        kind: FileKind = FileKind.OTHER,
        presence: FilePresence = FilePresence.PRESENT,
        lastSeenScanId: Long = 1,
        createdAt: Long? = null,
        name: String = relativePath.substringAfterLast('/'),
        extension: String = extensionOf(name),
    ): FileEntry = FileEntry(
        id = id,
        volumeId = volumeId,
        relativePath = relativePath,
        name = name,
        extension = extension,
        kind = kind,
        size = size,
        modifiedAt = modifiedAt,
        createdAt = createdAt,
        quickHash = quickHash,
        fullHash = fullHash,
        fingerprint = fingerprint,
        fingerprintKind = fingerprintKind,
        presence = presence,
        lastSeenScanId = lastSeenScanId,
    )

    private fun extensionOf(name: String): String {
        val dot = name.lastIndexOf('.')
        return if (dot <= 0 || dot == name.length - 1) "" else name.substring(dot + 1).lowercase()
    }
}

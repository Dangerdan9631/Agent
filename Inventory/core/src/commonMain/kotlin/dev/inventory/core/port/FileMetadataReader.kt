package dev.inventory.core.port

import dev.inventory.core.domain.file.FileKind

/**
 * Extracts embedded metadata (EXIF, audio tags, archive listings) from a file on disk.
 */
interface FileMetadataReader {
    /**
     * Returns the metadata for the content at path, or FileMetadata.EMPTY when the kind is unsupported or unreadable.
     */
    suspend fun read(path: String, kind: FileKind, extension: String): FileMetadata
}

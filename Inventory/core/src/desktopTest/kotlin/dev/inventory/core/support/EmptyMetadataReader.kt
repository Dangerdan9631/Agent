package dev.inventory.core.support

import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.port.FileMetadata
import dev.inventory.core.port.FileMetadataReader

/**
 * FileMetadataReader that always returns empty metadata.
 */
class EmptyMetadataReader : FileMetadataReader {
    override suspend fun read(path: String, kind: FileKind, extension: String): FileMetadata = FileMetadata.EMPTY
}

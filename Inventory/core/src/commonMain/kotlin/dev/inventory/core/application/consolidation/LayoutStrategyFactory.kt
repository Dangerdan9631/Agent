package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.port.FileMetadataReader
import dev.inventory.core.port.FileSystemPort

/**
 * Builds the LayoutStrategy implementation for a plan's configured kind.
 */
class LayoutStrategyFactory(
    private val metadata: FileMetadataReader,
    private val fileSystem: FileSystemPort,
) {
    /**
     * Returns the strategy for kind.
     */
    fun create(kind: LayoutStrategyKind): LayoutStrategy {
        val sanitizer = PathSanitizer()
        val preserve = PreserveKeeperRelativePathStrategy(sanitizer)
        return when (kind) {
            LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH -> preserve
            LayoutStrategyKind.DATE_FOLDERS_FOR_MEDIA -> DateFoldersForMediaStrategy(preserve, metadata, fileSystem, EpochCalendar())
            LayoutStrategyKind.TAG_FOLDERS -> TagFoldersStrategy(sanitizer)
        }
    }
}

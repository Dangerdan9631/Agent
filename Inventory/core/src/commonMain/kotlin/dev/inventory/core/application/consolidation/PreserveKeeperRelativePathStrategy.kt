package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.file.FileEntry

/**
 * Places each file at volume-label/relative-path so the consolidated tree mirrors the source drives.
 */
class PreserveKeeperRelativePathStrategy(
    private val sanitizer: PathSanitizer,
) : LayoutStrategy {
    override suspend fun destinationRelativePath(file: FileEntry, context: LayoutContext): String {
        val label = context.volumes[file.volumeId]?.label ?: "volume-${file.volumeId}"
        return sanitizer.segment(label) + "/" + file.relativePath
    }
}

package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.file.FileEntry

/**
 * Places each file under a folder named after its alphabetically first tag, or "Untagged", keeping the source relative path beneath it.
 */
class TagFoldersStrategy(
    private val sanitizer: PathSanitizer,
) : LayoutStrategy {
    override suspend fun destinationRelativePath(file: FileEntry, context: LayoutContext): String {
        val tag = context.tagsByFile[file.id]?.minByOrNull { it.name.lowercase() }?.name ?: "Untagged"
        return sanitizer.segment(tag) + "/" + file.relativePath
    }
}

package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.file.FileEntry

/**
 * Derives the forward-slash relative destination path for a file inside the consolidated tree.
 */
interface LayoutStrategy {
    /**
     * Returns the destination path relative to the plan's destination root, without a leading slash.
     */
    suspend fun destinationRelativePath(file: FileEntry, context: LayoutContext): String
}

package dev.inventory.app.presentation.browser

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.BrowserFolderNode

/**
 * One visible row in the flattened browser tree list.
 */
sealed interface BrowserTreeRow {
    val depth: Int

    /**
     * A registered volume root.
     */
    data class VolumeRow(val volume: Volume, override val depth: Int) : BrowserTreeRow

    /**
     * A folder under a volume.
     */
    data class FolderRow(val volumeId: Long, val node: BrowserFolderNode, override val depth: Int) : BrowserTreeRow

    /**
     * A file under a volume.
     */
    data class FileRow(val file: FileEntry, override val depth: Int) : BrowserTreeRow
}

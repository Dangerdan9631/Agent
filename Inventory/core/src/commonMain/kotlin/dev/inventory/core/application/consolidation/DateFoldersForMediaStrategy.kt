package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.port.FileMetadataReader
import dev.inventory.core.port.FileSystemPort

/**
 * Places images, video, and audio under Kind/YYYY/MM by capture date (falling back to modified date); other files mirror their source path.
 */
class DateFoldersForMediaStrategy(
    private val fallback: LayoutStrategy,
    private val metadata: FileMetadataReader,
    private val fileSystem: FileSystemPort,
    private val calendar: EpochCalendar,
) : LayoutStrategy {
    override suspend fun destinationRelativePath(file: FileEntry, context: LayoutContext): String {
        if (file.kind !in MEDIA) return fallback.destinationRelativePath(file, context)
        val root = context.volumes[file.volumeId]?.rootPath
        val captured = root?.let { metadata.read(fileSystem.resolve(it, file.relativePath), file.kind, file.extension).captureDate }
        val (year, month) = calendar.yearAndMonth(captured ?: file.modifiedAt)
        val folder = when (file.kind) {
            FileKind.IMAGE -> "Photos"
            FileKind.VIDEO -> "Videos"
            else -> "Music"
        }
        return "$folder/$year/${month.toString().padStart(2, '0')}/${file.name}"
    }

    private companion object {
        val MEDIA = setOf(FileKind.IMAGE, FileKind.VIDEO, FileKind.AUDIO)
    }
}

package dev.inventory.app.presentation.browser

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileMetadata
import dev.inventory.core.port.FileMetadataReader
import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.TagRepository
import dev.inventory.core.port.VolumeRepository

/**
 * Assembles a FileDetail for one file from repositories, metadata, and a short text preview.
 */
class FileDetailLoader(
    private val files: FileEntryRepository,
    private val volumes: VolumeRepository,
    private val groups: DuplicateGroupRepository,
    private val tags: TagRepository,
    private val decisions: FileDecisionRepository,
    private val metadata: FileMetadataReader,
    private val fileSystem: FileSystemPort,
) {
    /**
     * Returns the detail for the file, tolerating unreadable content by leaving metadata and preview empty.
     */
    suspend fun load(file: FileEntry): FileDetail {
        val volume = volumes.byId(file.volumeId)
        val path = volume?.let { fileSystem.resolve(it.rootPath, file.relativePath) } ?: file.relativePath
        val fullHash = file.fullHash
        val quickHash = file.quickHash
        val copies = when {
            fullHash != null -> files.copiesWithFullHash(fullHash)
            quickHash != null -> files.copiesWithQuickHash(file.size, quickHash)
            else -> emptyList()
        }.filter { it.id != file.id }
        val readable = volume != null && fileSystem.exists(path)
        val meta = if (readable) metadata.read(path, file.kind, file.extension) else FileMetadata.EMPTY
        val preview = if (readable && isText(file)) runCatching { fileSystem.readHead(path, PREVIEW_BYTES).decodeToString() }.getOrNull() else null
        return FileDetail(
            file = file,
            volume = volume,
            absolutePath = path,
            copies = copies,
            groups = groups.groupsForFile(file.id),
            tags = tags.tagsForFiles(listOf(file.id))[file.id] ?: emptyList(),
            decision = decisions.forFiles(listOf(file.id))[file.id],
            metadata = meta,
            textPreview = preview?.takeIf { text -> text.none { it == '\u0000' } },
        )
    }

    private fun isText(file: FileEntry): Boolean =
        file.kind == FileKind.SOURCE || file.extension in TEXT_EXTENSIONS

    private companion object {
        const val PREVIEW_BYTES = 16 * 1024
        val TEXT_EXTENSIONS = setOf("txt", "md", "csv", "tsv", "log", "tex", "rtf", "")
    }
}

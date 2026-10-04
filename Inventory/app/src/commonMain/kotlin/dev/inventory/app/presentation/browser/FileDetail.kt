package dev.inventory.app.presentation.browser

import dev.inventory.core.domain.decision.FileDecision
import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.FileMetadata

/**
 * Everything the detail panel shows for one selected file.
 */
data class FileDetail(
    /**
     * The selected file.
     */
    val file: FileEntry,
    /**
     * Volume the file lives on.
     */
    val volume: Volume?,
    /**
     * Native absolute path of the file.
     */
    val absolutePath: String,
    /**
     * Other entries (any presence) with identical full hash, or identical size and quick hash when no full hash exists.
     */
    val copies: List<FileEntry>,
    /**
     * Duplicate groups containing the file.
     */
    val groups: List<DuplicateGroup>,
    /**
     * Tags attached to the file.
     */
    val tags: List<Tag>,
    /**
     * Recorded decision, or null when undecided.
     */
    val decision: FileDecision?,
    /**
     * Extracted metadata.
     */
    val metadata: FileMetadata,
    /**
     * First kilobytes of a text file for preview, or null when not text.
     */
    val textPreview: String?,
)

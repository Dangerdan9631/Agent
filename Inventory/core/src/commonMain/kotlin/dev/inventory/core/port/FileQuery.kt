package dev.inventory.core.port

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FilePresence

/**
 * Filter and ordering criteria for listing files in the browser; every filter is optional and combined with AND.
 */
data class FileQuery(
    /**
     * Restrict to these volumes; empty means all volumes.
     */
    val volumeIds: Set<Long> = emptySet(),
    /**
     * Restrict to these kinds; empty means all kinds.
     */
    val kinds: Set<FileKind> = emptySet(),
    /**
     * Restrict to this lowercase extension without a dot; null means any extension.
     */
    val extension: String? = null,
    /**
     * Case-insensitive substring that must appear in the relative path; null means no text filter.
     */
    val pathContains: String? = null,
    /**
     * Minimum size in bytes inclusive, or null.
     */
    val minSize: Long? = null,
    /**
     * Maximum size in bytes inclusive, or null.
     */
    val maxSize: Long? = null,
    /**
     * Restrict to files carrying any of these tags; empty means no tag filter.
     */
    val tagIds: Set<Long> = emptySet(),
    /**
     * Restrict by duplicate group membership.
     */
    val duplicateStatus: DuplicateStatusFilter = DuplicateStatusFilter.ANY,
    /**
     * Restrict to these decisions; UNDECIDED matches files without a decision row; empty means all.
     */
    val decisions: Set<Decision> = emptySet(),
    /**
     * Restrict to this presence state, or null for both.
     */
    val presence: FilePresence? = FilePresence.PRESENT,
    /**
     * Column to order by.
     */
    val sortField: FileSortField = FileSortField.PATH,
    /**
     * When true, order descending.
     */
    val sortDescending: Boolean = false,
)

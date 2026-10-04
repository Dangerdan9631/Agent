package dev.inventory.app.presentation.duplicates

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.domain.file.FileEntry

/**
 * A duplicate group expanded with its member files or directories for side-by-side review.
 */
data class GroupDetail(
    /**
     * The group.
     */
    val group: DuplicateGroup,
    /**
     * Membership rows with scores.
     */
    val members: List<DuplicateGroupMember>,
    /**
     * Member files for EXACT and PROBABLE groups, in member order; empty for FOLDER groups.
     */
    val files: List<FileEntry>,
    /**
     * Member directories for FOLDER groups, in member order; empty otherwise.
     */
    val directories: List<DirectoryEntry>,
    /**
     * Recorded decision per member file.
     */
    val decisions: Map<Long, Decision>,
    /**
     * Native absolute path per member file or directory identifier.
     */
    val absolutePaths: Map<Long, String>,
    /**
     * Nested files and folders inside one copy of a FOLDER group. Empty for file groups.
     */
    val contentTree: List<ContentNode> = emptyList(),
)

/**
 * A file or nested folder inside a duplicate directory.
 */
data class ContentNode(
    /**
     * Name of this file or folder.
     */
    val name: String,
    /**
     * Path of this node relative to the duplicate directory, using forward slashes.
     */
    val path: String,
    /**
     * The file at this node, or null when the node is a folder.
     */
    val file: FileEntry?,
    /**
     * Nested files and folders. Empty for a file.
     */
    val children: List<ContentNode>,
)

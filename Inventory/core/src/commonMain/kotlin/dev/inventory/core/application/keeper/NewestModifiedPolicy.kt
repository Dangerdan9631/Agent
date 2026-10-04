package dev.inventory.core.application.keeper

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume

/**
 * Keeps the most recently modified member, breaking ties by shortest path.
 */
class NewestModifiedPolicy : KeeperSelectionPolicy {
    override fun choose(members: List<FileEntry>, volumes: Map<Long, Volume>): FileEntry =
        members.sortedWith(compareByDescending<FileEntry> { it.modifiedAt }.thenBy { it.relativePath.length }.thenBy { it.id }).first()
}

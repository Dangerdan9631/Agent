package dev.inventory.core.application.keeper

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume

/**
 * Keeps the least recently modified member, breaking ties by shortest path.
 */
class OldestModifiedPolicy : KeeperSelectionPolicy {
    override fun choose(members: List<FileEntry>, volumes: Map<Long, Volume>): FileEntry =
        members.sortedWith(compareBy<FileEntry> { it.modifiedAt }.thenBy { it.relativePath.length }.thenBy { it.id }).first()
}

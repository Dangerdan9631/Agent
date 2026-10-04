package dev.inventory.core.application.keeper

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume

/**
 * Keeps the member with the shortest relative path, breaking ties alphabetically and then by identifier.
 */
class ShortestPathPolicy : KeeperSelectionPolicy {
    override fun choose(members: List<FileEntry>, volumes: Map<Long, Volume>): FileEntry =
        members.sortedWith(compareBy<FileEntry> { it.relativePath.length }.thenBy { it.relativePath }.thenBy { it.id }).first()
}

package dev.inventory.core.application.keeper

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume

/**
 * Keeps the member on the volume that appears earliest in the preferred order, breaking ties by shortest path.
 */
class PreferredVolumeOrderPolicy(
    private val preferredVolumeIds: List<Long>,
) : KeeperSelectionPolicy {
    override fun choose(members: List<FileEntry>, volumes: Map<Long, Volume>): FileEntry {
        fun rank(file: FileEntry): Int = preferredVolumeIds.indexOf(file.volumeId).let { if (it < 0) Int.MAX_VALUE else it }
        return members.sortedWith(compareBy<FileEntry> { rank(it) }.thenBy { it.relativePath.length }.thenBy { it.id }).first()
    }
}

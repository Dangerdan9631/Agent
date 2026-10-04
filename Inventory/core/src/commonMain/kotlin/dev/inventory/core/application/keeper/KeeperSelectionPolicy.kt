package dev.inventory.core.application.keeper

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume

/**
 * Chooses which member of a duplicate group should be kept.
 */
interface KeeperSelectionPolicy {
    /**
     * Returns the member to keep from a non-empty list, given the volumes the members live on.
     */
    fun choose(members: List<FileEntry>, volumes: Map<Long, Volume>): FileEntry
}

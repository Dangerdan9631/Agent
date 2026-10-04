package dev.inventory.core.application.keeper

/**
 * Builds the KeeperSelectionPolicy implementation for a user-selected kind.
 */
class KeeperPolicyFactory {
    /**
     * Returns the policy for kind; preferredVolumeIds is only consulted for PREFERRED_VOLUME_ORDER.
     */
    fun create(kind: KeeperPolicyKind, preferredVolumeIds: List<Long>): KeeperSelectionPolicy = when (kind) {
        KeeperPolicyKind.NEWEST_MODIFIED -> NewestModifiedPolicy()
        KeeperPolicyKind.OLDEST_MODIFIED -> OldestModifiedPolicy()
        KeeperPolicyKind.PREFERRED_VOLUME_ORDER -> PreferredVolumeOrderPolicy(preferredVolumeIds)
        KeeperPolicyKind.SHORTEST_PATH -> ShortestPathPolicy()
    }
}

package dev.inventory.core.application.keeper

/**
 * The keeper selection policies a user can pick from.
 */
enum class KeeperPolicyKind {
    /**
     * Keep the copy with the most recent modified time.
     */
    NEWEST_MODIFIED,

    /**
     * Keep the copy with the oldest modified time.
     */
    OLDEST_MODIFIED,

    /**
     * Keep the copy on the earliest volume in the user's preferred order.
     */
    PREFERRED_VOLUME_ORDER,

    /**
     * Keep the copy with the shortest relative path.
     */
    SHORTEST_PATH,
}

package dev.inventory.core.domain.volume

/**
 * A root folder or drive that the user has registered for inventory scanning.
 */
data class Volume(
    /**
     * Database identifier; 0 for a volume that has not been persisted yet.
     */
    val id: Long,
    /**
     * Human readable label chosen by the user, for example "2019 backup drive".
     */
    val label: String,
    /**
     * Absolute path to the root folder in platform-native form.
     */
    val rootPath: String,
    /**
     * Epoch milliseconds of the last completed scan, or null if never scanned.
     */
    val lastScanAt: Long?,
)

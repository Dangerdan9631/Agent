package dev.inventory.core.application.consolidation

/**
 * Resolves destination path collisions between planned files.
 */
interface ConflictPolicy {
    /**
     * Returns the path to use for a file that wants desiredPath when taken already holds that path (case-insensitive), or null to skip the file.
     */
    fun resolve(desiredPath: String, taken: Set<String>): String?
}

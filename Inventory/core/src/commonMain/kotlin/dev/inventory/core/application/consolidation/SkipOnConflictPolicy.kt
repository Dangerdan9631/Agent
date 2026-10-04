package dev.inventory.core.application.consolidation

/**
 * Leaves conflicting files in place by returning null.
 */
class SkipOnConflictPolicy : ConflictPolicy {
    override fun resolve(desiredPath: String, taken: Set<String>): String? = null
}

package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.consolidation.ConflictPolicyKind

/**
 * Builds the ConflictPolicy implementation for a plan's configured kind.
 */
class ConflictPolicyFactory {
    /**
     * Returns the policy for kind.
     */
    fun create(kind: ConflictPolicyKind): ConflictPolicy = when (kind) {
        ConflictPolicyKind.RENAME_WITH_SUFFIX -> RenameWithSuffixPolicy()
        ConflictPolicyKind.SKIP -> SkipOnConflictPolicy()
    }
}

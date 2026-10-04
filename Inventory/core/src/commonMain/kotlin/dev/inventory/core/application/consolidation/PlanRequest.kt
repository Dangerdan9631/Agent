package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.LayoutStrategyKind

/**
 * User-chosen settings for building a consolidation plan.
 */
data class PlanRequest(
    /**
     * Absolute destination root in platform-native form.
     */
    val destinationRoot: String,
    /**
     * Strategy for deriving destination paths.
     */
    val layoutStrategy: LayoutStrategyKind,
    /**
     * Policy for colliding destination paths.
     */
    val conflictPolicy: ConflictPolicyKind,
    /**
     * When true, non-keeper members of EXACT groups are deleted after the keeper is verified at the destination.
     */
    val removeRedundantExact: Boolean,
    /**
     * Restrict the plan to files on these volumes; empty means every volume.
     */
    val volumeIds: Set<Long> = emptySet(),
)

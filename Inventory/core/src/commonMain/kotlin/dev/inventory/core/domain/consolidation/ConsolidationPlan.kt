package dev.inventory.core.domain.consolidation

/**
 * A planned consolidation run: where files go, how paths are laid out, and how conflicts and redundant copies are handled.
 */
data class ConsolidationPlan(
    /**
     * Database identifier; 0 for a plan that has not been persisted yet.
     */
    val id: Long,
    /**
     * Absolute destination root in platform-native form; must not lie inside any scanned volume.
     */
    val destinationRoot: String,
    /**
     * Strategy used to derive destination paths.
     */
    val layoutStrategy: LayoutStrategyKind,
    /**
     * Policy used when two files resolve to the same destination path.
     */
    val conflictPolicy: ConflictPolicyKind,
    /**
     * When true, non-keeper members of EXACT groups are deleted after the keeper has been verified at the destination.
     */
    val removeRedundantExact: Boolean,
    /**
     * Lifecycle state of the plan.
     */
    val status: PlanStatus,
    /**
     * Epoch milliseconds when the plan was created.
     */
    val createdAt: Long,
)

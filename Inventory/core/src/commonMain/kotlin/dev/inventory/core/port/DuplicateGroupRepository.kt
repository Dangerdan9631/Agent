package dev.inventory.core.port

import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState

/**
 * Persistence for duplicate groups and their members.
 */
interface DuplicateGroupRepository {
    /**
     * Inserts the group and members, or when a group with the same memberKey exists updates its reason and confidence and returns the existing row.
     */
    suspend fun upsert(group: DuplicateGroup, members: List<DuplicateGroupMember>, confirmedRun: Long = 0): DuplicateGroup

    /**
     * Returns the group with this member key, or null.
     */
    suspend fun byMemberKey(memberKey: String): DuplicateGroup?

    /**
     * Records that an existing group was seen by an analysis run without changing its reason or confidence.
     */
    suspend fun stampConfirmed(groupId: Long, confirmedRun: Long)

    /**
     * Clears the confirmation stamp on every OPEN group so a finished analysis can prune groups it does not re-save.
     */
    suspend fun clearOpenConfirmation()

    /**
     * Deletes OPEN groups whose confirmation stamp is not confirmedRun and returns how many were removed.
     */
    suspend fun deleteOpenUnconfirmed(confirmedRun: Long): Long

    /**
     * Deletes OPEN groups of kind that share a member with memberIds and whose members are covered by that set.
     * When properSubset is true, equal member sets are kept. exceptGroupId is never deleted.
     */
    suspend fun deleteOpenCoveredBy(
        kind: DuplicateGroupKind,
        memberIds: Set<Long>,
        exceptGroupId: Long,
        properSubset: Boolean,
    ): Long

    /**
     * Deletes every OPEN group of the kind whose memberKey is not in keepKeys and returns how many were removed.
     */
    suspend fun deleteOpenGroupsNotIn(kind: DuplicateGroupKind, keepKeys: Set<String>): Long

    /**
     * Deletes groups whose members reference files or directories that no longer exist or are MISSING.
     */
    suspend fun deleteGroupsWithMissingMembers(): Long

    /**
     * Returns the group with the given identifier, or null.
     */
    suspend fun byId(id: Long): DuplicateGroup?

    /**
     * Returns a page of group summaries of the kind, optionally restricted to a review state, largest first.
     */
    suspend fun summaries(kind: DuplicateGroupKind, state: ReviewState?, limit: Int, offset: Int): List<DuplicateGroupSummary>

    /**
     * Returns the number of groups of the kind in the given review state (or all states when null).
     */
    suspend fun count(kind: DuplicateGroupKind, state: ReviewState?): Long

    /**
     * Returns the members of a group.
     */
    suspend fun members(groupId: Long): List<DuplicateGroupMember>

    /**
     * Returns every EXACT or PROBABLE group that contains the file.
     */
    suspend fun groupsForFile(fileId: Long): List<DuplicateGroup>

    /**
     * Returns every group of the kind together with its members, regardless of review state.
     */
    suspend fun allWithMembers(kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>>

    /**
     * Returns every OPEN group of the kind with its members.
     */
    suspend fun openWithMembers(kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>>

    /**
     * Sets the keeper and review state of a group.
     */
    suspend fun setResolution(groupId: Long, keeperId: Long?, state: ReviewState)
}

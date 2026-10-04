package dev.inventory.core.support

import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.DuplicateGroupSummary

/**
 * In-memory DuplicateGroupRepository used by core unit tests.
 */
class InMemoryDuplicateGroupRepository : DuplicateGroupRepository {
    private val groups = LinkedHashMap<Long, DuplicateGroup>()
    private val members = LinkedHashMap<Long, MutableList<DuplicateGroupMember>>()
    private val confirmed = HashMap<Long, Long>()
    private var nextId = 1L

    override suspend fun upsert(group: DuplicateGroup, members: List<DuplicateGroupMember>, confirmedRun: Long): DuplicateGroup {
        val existing = groups.values.firstOrNull { it.memberKey == group.memberKey }
        if (existing != null) {
            if (group.confidence >= existing.confidence) {
                groups[existing.id] = existing.copy(reason = group.reason, confidence = group.confidence)
                this.members[existing.id] = members.map { it.copy(groupId = existing.id) }.toMutableList()
            }
            confirmed[existing.id] = confirmedRun
            return groups.getValue(existing.id)
        }
        val stored = group.copy(id = nextId++)
        groups[stored.id] = stored
        this.members[stored.id] = members.map { it.copy(groupId = stored.id) }.toMutableList()
        confirmed[stored.id] = confirmedRun
        return stored
    }

    override suspend fun byMemberKey(memberKey: String): DuplicateGroup? = groups.values.firstOrNull { it.memberKey == memberKey }

    override suspend fun stampConfirmed(groupId: Long, confirmedRun: Long) {
        if (groups.containsKey(groupId)) confirmed[groupId] = confirmedRun
    }

    override suspend fun clearOpenConfirmation() {
        groups.values.filter { it.reviewState == ReviewState.OPEN }.forEach { confirmed[it.id] = 0L }
    }

    override suspend fun deleteOpenUnconfirmed(confirmedRun: Long): Long {
        val doomed = groups.values.filter { it.reviewState == ReviewState.OPEN && (confirmed[it.id] ?: 0L) != confirmedRun }
        doomed.forEach {
            groups.remove(it.id)
            members.remove(it.id)
            confirmed.remove(it.id)
        }
        return doomed.size.toLong()
    }

    override suspend fun deleteOpenCoveredBy(
        kind: DuplicateGroupKind,
        memberIds: Set<Long>,
        exceptGroupId: Long,
        properSubset: Boolean,
    ): Long {
        if (memberIds.isEmpty()) return 0
        val doomed = groups.values.filter { group ->
            if (group.kind != kind || group.reviewState != ReviewState.OPEN || group.id == exceptGroupId) return@filter false
            val covered = members[group.id].orEmpty().map { it.memberId }.toSet()
            val shares = covered.any { it in memberIds }
            val subset = covered.isNotEmpty() && covered.all { it in memberIds }
            shares && subset && (!properSubset || covered.size < memberIds.size)
        }
        doomed.forEach {
            groups.remove(it.id)
            members.remove(it.id)
            confirmed.remove(it.id)
        }
        return doomed.size.toLong()
    }

    override suspend fun deleteOpenGroupsNotIn(kind: DuplicateGroupKind, keepKeys: Set<String>): Long {
        val doomed = groups.values.filter { it.kind == kind && it.reviewState == ReviewState.OPEN && it.memberKey !in keepKeys }
        doomed.forEach {
            groups.remove(it.id)
            members.remove(it.id)
        }
        return doomed.size.toLong()
    }

    override suspend fun deleteGroupsWithMissingMembers(): Long = 0

    override suspend fun byId(id: Long): DuplicateGroup? = groups[id]

    override suspend fun summaries(kind: DuplicateGroupKind, state: ReviewState?, limit: Int, offset: Int): List<DuplicateGroupSummary> =
        groups.values
            .filter { it.kind == kind && (state == null || it.reviewState == state) }
            .drop(offset).take(limit)
            .map { DuplicateGroupSummary(it, members[it.id]?.size?.toLong() ?: 0, 0, "") }

    override suspend fun count(kind: DuplicateGroupKind, state: ReviewState?): Long =
        groups.values.count { it.kind == kind && (state == null || it.reviewState == state) }.toLong()

    override suspend fun members(groupId: Long): List<DuplicateGroupMember> = members[groupId].orEmpty()

    override suspend fun groupsForFile(fileId: Long): List<DuplicateGroup> =
        members.filter { (_, list) -> list.any { it.memberId == fileId } }.keys.mapNotNull { groups[it] }

    override suspend fun allWithMembers(kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>> =
        groups.values.filter { it.kind == kind }.map { it to members[it.id].orEmpty() }

    override suspend fun openWithMembers(kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>> =
        allWithMembers(kind).filter { it.first.reviewState == ReviewState.OPEN }

    override suspend fun setResolution(groupId: Long, keeperId: Long?, state: ReviewState) {
        groups[groupId]?.let { groups[groupId] = it.copy(keeperFileId = keeperId, reviewState = state) }
    }
}

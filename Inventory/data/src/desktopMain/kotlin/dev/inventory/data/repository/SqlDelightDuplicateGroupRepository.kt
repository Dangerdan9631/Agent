package dev.inventory.data.repository

import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.DuplicateGroupSummary
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.Duplicate_group
import dev.inventory.data.db.Duplicate_group_member
import dev.inventory.data.db.InventoryDatabase

/**
 * DuplicateGroupRepository backed by the SQLDelight duplicate_group tables.
 */
class SqlDelightDuplicateGroupRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : DuplicateGroupRepository {
    private val queries get() = database.duplicateGroupQueries

    override suspend fun upsert(group: DuplicateGroup, members: List<DuplicateGroupMember>, confirmedRun: Long): DuplicateGroup = executor.run {
        database.transactionWithResult {
            val existing = queries.selectByMemberKey(group.memberKey).executeAsOneOrNull()
            val id = if (existing != null) {
                if (group.confidence >= existing.confidence) {
                    queries.refreshGroup(group.reason, group.confidence, confirmedRun, existing.id)
                    members.forEach { queries.insertMember(existing.id, it.memberId, it.score) }
                } else {
                    queries.stampConfirmed(confirmedRun, existing.id)
                }
                existing.id
            } else {
                queries.insertGroup(group.kind.name, group.reason, group.confidence, group.memberKey, group.detectedAt, confirmedRun)
                val inserted = queries.lastInsertedId().executeAsOne()
                members.forEach { queries.insertMember(inserted, it.memberId, it.score) }
                inserted
            }
            queries.selectById(id).executeAsOne().toDomain()
        }
    }

    override suspend fun byMemberKey(memberKey: String): DuplicateGroup? =
        executor.run { queries.selectByMemberKey(memberKey).executeAsOneOrNull()?.toDomain() }

    override suspend fun stampConfirmed(groupId: Long, confirmedRun: Long) =
        executor.run { queries.stampConfirmed(confirmedRun, groupId); Unit }

    override suspend fun clearOpenConfirmation() = executor.run { queries.clearOpenConfirmation(); Unit }

    override suspend fun deleteOpenUnconfirmed(confirmedRun: Long): Long =
        executor.run { queries.deleteOpenUnconfirmed(confirmedRun).value }

    override suspend fun deleteOpenCoveredBy(
        kind: DuplicateGroupKind,
        memberIds: Set<Long>,
        exceptGroupId: Long,
        properSubset: Boolean,
    ): Long = executor.run {
        if (memberIds.isEmpty()) return@run 0L
        val candidates = memberIds.chunked(IN_CHUNK).flatMap { chunk ->
            queries.selectOpenIdsSharingMembers(kind.name, exceptGroupId, chunk).executeAsList()
        }.toSet()
        var removed = 0L
        for (groupId in candidates) {
            val covered = queries.selectMembers(groupId).executeAsList().map { it.member_id }.toSet()
            val subset = covered.isNotEmpty() && covered.all { it in memberIds }
            val proper = covered.size < memberIds.size
            if (subset && (!properSubset || proper)) {
                queries.deleteGroup(groupId)
                removed++
            }
        }
        removed
    }

    override suspend fun deleteOpenGroupsNotIn(kind: DuplicateGroupKind, keepKeys: Set<String>): Long = executor.run {
        database.transactionWithResult {
            val stale = queries.selectOpenKeysOfKind(kind.name).executeAsList().filter { it.member_key !in keepKeys }
            stale.forEach { queries.deleteGroup(it.id) }
            stale.size.toLong()
        }
    }

    override suspend fun deleteGroupsWithMissingMembers(): Long = executor.run {
        database.transactionWithResult {
            queries.deleteFileGroupsWithMissingMembers().value + queries.deleteFolderGroupsWithMissingMembers().value
        }
    }

    override suspend fun byId(id: Long): DuplicateGroup? =
        executor.run { queries.selectById(id).executeAsOneOrNull()?.toDomain() }

    override suspend fun summaries(kind: DuplicateGroupKind, state: ReviewState?, limit: Int, offset: Int): List<DuplicateGroupSummary> =
        executor.run {
            val l = limit.toLong()
            val o = offset.toLong()
            if (kind == DuplicateGroupKind.FOLDER) {
                if (state == null) {
                    queries.selectFolderSummaries(l, o) { id, k, reason, confidence, key, keeper, review, detected, _, count, bytes, sample ->
                        summary(id, k, reason, confidence, key, keeper, review, detected, count, bytes, sample)
                    }.executeAsList()
                } else {
                    queries.selectFolderSummariesInState(state.name, l, o) { id, k, reason, confidence, key, keeper, review, detected, _, count, bytes, sample ->
                        summary(id, k, reason, confidence, key, keeper, review, detected, count, bytes, sample)
                    }.executeAsList()
                }
            } else {
                if (state == null) {
                    queries.selectFileSummaries(kind.name, l, o) { id, k, reason, confidence, key, keeper, review, detected, _, count, bytes, sample ->
                        summary(id, k, reason, confidence, key, keeper, review, detected, count, bytes, sample)
                    }.executeAsList()
                } else {
                    queries.selectFileSummariesInState(kind.name, state.name, l, o) { id, k, reason, confidence, key, keeper, review, detected, _, count, bytes, sample ->
                        summary(id, k, reason, confidence, key, keeper, review, detected, count, bytes, sample)
                    }.executeAsList()
                }
            }
        }

    override suspend fun count(kind: DuplicateGroupKind, state: ReviewState?): Long = executor.run {
        if (state == null) queries.countGroups(kind.name).executeAsOne() else queries.countGroupsInState(kind.name, state.name).executeAsOne()
    }

    override suspend fun members(groupId: Long): List<DuplicateGroupMember> =
        executor.run { queries.selectMembers(groupId).executeAsList().map { it.toDomain() } }

    override suspend fun groupsForFile(fileId: Long): List<DuplicateGroup> =
        executor.run { queries.selectGroupsForFile(fileId).executeAsList().map { it.toDomain() } }

    override suspend fun allWithMembers(kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>> =
        executor.run { joinMembers(queries.selectAllOfKind(kind.name).executeAsList(), kind) }

    override suspend fun openWithMembers(kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>> =
        executor.run { joinMembers(queries.selectOpenOfKind(kind.name).executeAsList(), kind) }

    override suspend fun setResolution(groupId: Long, keeperId: Long?, state: ReviewState) =
        executor.run { queries.setResolution(keeperId, state.name, groupId); Unit }

    private fun joinMembers(groups: List<Duplicate_group>, kind: DuplicateGroupKind): List<Pair<DuplicateGroup, List<DuplicateGroupMember>>> {
        val membersByGroup = queries.selectMembersOfKind(kind.name).executeAsList().groupBy { it.group_id }
        return groups.map { g -> g.toDomain() to (membersByGroup[g.id] ?: emptyList()).map { it.toDomain() } }
    }

    private fun summary(
        id: Long, kind: String, reason: String, confidence: Double, memberKey: String, keeperId: Long?,
        reviewState: String, detectedAt: Long, memberCount: Long, totalBytes: Double, sampleName: String?,
    ) = DuplicateGroupSummary(
        group = DuplicateGroup(id, DuplicateGroupKind.valueOf(kind), reason, confidence, memberKey, keeperId, ReviewState.valueOf(reviewState), detectedAt),
        memberCount = memberCount,
        totalBytes = totalBytes.toLong(),
        sampleName = sampleName ?: "",
    )

    private fun Duplicate_group.toDomain() = DuplicateGroup(
        id = id,
        kind = DuplicateGroupKind.valueOf(kind),
        reason = reason,
        confidence = confidence,
        memberKey = member_key,
        keeperFileId = keeper_id,
        reviewState = ReviewState.valueOf(review_state),
        detectedAt = detected_at,
    )

    private fun Duplicate_group_member.toDomain() = DuplicateGroupMember(group_id, member_id, score)

    private companion object {
        const val IN_CHUNK = 500
    }
}

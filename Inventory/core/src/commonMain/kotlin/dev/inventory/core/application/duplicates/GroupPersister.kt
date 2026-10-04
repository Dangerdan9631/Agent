package dev.inventory.core.application.duplicates

import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.DuplicateGroupMember
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.port.Clock
import dev.inventory.core.port.DuplicateGroupRepository

/**
 * Saves duplicate groups as they are found and drops open groups that are now a subset of a larger match.
 */
class GroupPersister(
    private val groups: DuplicateGroupRepository,
    private val clock: Clock,
    /**
     * Stamp written onto every group this analysis run confirms.
     */
    val runId: Long,
) {
    /**
     * Groups inserted or given a stronger reason during this run.
     */
    var found: Long = 0
        private set

    /**
     * Upserts the candidate when it is new or at least as strong as the stored group, and stamps it as confirmed.
     */
    suspend fun save(candidate: DuplicateCandidate) {
        if (candidate.members.size < 2) return
        val memberIds = candidate.members.map { it.first }
        val existing = groups.byMemberKey(candidate.memberKey)
        if (existing != null && candidate.confidence < existing.confidence) {
            groups.stampConfirmed(existing.id, runId)
            return
        }
        val stored = groups.upsert(
            DuplicateGroup(
                id = 0,
                kind = candidate.kind,
                reason = candidate.reason,
                confidence = candidate.confidence,
                memberKey = candidate.memberKey,
                keeperFileId = null,
                reviewState = ReviewState.OPEN,
                detectedAt = existing?.detectedAt ?: clock.now(),
            ),
            candidate.members.map { (id, score) -> DuplicateGroupMember(0, id, score) },
            runId,
        )
        val changed = existing == null || candidate.confidence > existing.confidence || candidate.reason != existing.reason
        if (!changed) return
        found++
        val ids = memberIds.toSet()
        groups.deleteOpenCoveredBy(candidate.kind, ids, stored.id, properSubset = true)
        if (candidate.kind == DuplicateGroupKind.EXACT) {
            groups.deleteOpenCoveredBy(DuplicateGroupKind.PROBABLE, ids, exceptGroupId = -1, properSubset = false)
        }
    }
}

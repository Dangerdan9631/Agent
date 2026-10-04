package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.application.duplicates.DuplicateCandidate
import dev.inventory.core.application.duplicates.ProbableMatchRule
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.MatchFile

/**
 * Proposes files with identical name and size whose content hashes are not already known to match.
 */
class SameNameAndSizeRule(
    private val files: FileEntryRepository,
) : ProbableMatchRule {
    override val reason: String = "same-name-size"

    override suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        files.forEachSharedNameAndSize { group ->
            if (group.size > 1 && !group.allShareFullHash()) onGroup(group.toCandidate(reason, CONFIDENCE))
        }
    }

    override suspend fun emitTouching(file: MatchFile, onGroup: suspend (DuplicateCandidate) -> Unit) {
        if (file.size <= 0) return
        val group = files.matchByNameAndSize(file.name, file.size)
        if (group.size > 1 && !group.allShareFullHash()) onGroup(group.toCandidate(reason, CONFIDENCE))
    }

    private companion object {
        const val CONFIDENCE = 0.7
    }
}

internal fun List<MatchFile>.allShareFullHash(): Boolean {
    val first = first().fullHash ?: return false
    return all { it.fullHash == first }
}

internal fun List<MatchFile>.toCandidate(reason: String, confidence: Double) = DuplicateCandidate(
    kind = DuplicateGroupKind.PROBABLE,
    reason = reason,
    confidence = confidence,
    members = map { it.id to confidence },
)

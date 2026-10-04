package dev.inventory.core.support

import dev.inventory.core.application.duplicates.DuplicateCandidate
import dev.inventory.core.application.duplicates.ProbableMatchRule

/**
 * ProbableMatchRule that returns a fixed list of candidates.
 */
class StubProbableMatchRule(
    override val reason: String,
    private val found: List<DuplicateCandidate>,
) : ProbableMatchRule {
    override suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        found.forEach { onGroup(it) }
    }
}

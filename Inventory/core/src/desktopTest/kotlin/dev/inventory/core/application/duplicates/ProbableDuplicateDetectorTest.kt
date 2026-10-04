package dev.inventory.core.application.duplicates

import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.support.StubProbableMatchRule
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Verifies probable proposals are merged by member set, prefer higher confidence, and skip exact groups.
 */
class ProbableDuplicateDetectorTest {
    @Test
    fun keepsTheStrongerProposalForTheSameMembers() = runTest {
        val weak = DuplicateCandidate(DuplicateGroupKind.PROBABLE, "same-name-size", 0.7, listOf(1L to 0.7, 2L to 0.7))
        val strong = DuplicateCandidate(DuplicateGroupKind.PROBABLE, "normalized-text", 0.9, listOf(2L to 0.9, 1L to 0.9))
        val detector = ProbableDuplicateDetector(
            listOf(StubProbableMatchRule("same-name-size", listOf(weak)), StubProbableMatchRule("normalized-text", listOf(strong))),
        )

        val found = detector.detect(emptySet())

        assertEquals(1, found.size)
        assertEquals("normalized-text", found.single().reason)
        assertEquals(0.9, found.single().confidence)
    }

    @Test
    fun skipsMemberSetsAlreadyCoveredByExactGroups() = runTest {
        val candidate = DuplicateCandidate(DuplicateGroupKind.PROBABLE, "same-name-size", 0.7, listOf(1L to 0.7, 2L to 0.7))
        val detector = ProbableDuplicateDetector(listOf(StubProbableMatchRule("same-name-size", listOf(candidate))))

        val found = detector.detect(setOf("EXACT:1,2"))

        assertEquals(emptyList<DuplicateCandidate>(), found)
    }
}

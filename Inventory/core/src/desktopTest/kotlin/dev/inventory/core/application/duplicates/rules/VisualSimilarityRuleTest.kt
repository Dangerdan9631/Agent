package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.InMemoryFileEntryRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies close image hashes are still grouped when a byte bucket is too large for a direct comparison.
 */
class VisualSimilarityRuleTest {
    @Test
    fun findsCloseHashesInsideACrowdedBucket() = runTest {
        val entries = FileEntries()
        val files = InMemoryFileEntryRepository()
        val identical = "ab00000000000000"
        val distant = listOf(
            "abffffffffffffffff",
            "ab0000ffff0000ff",
            "abffff0000ffff00",
            "ab00ff00ff00ff00",
        )
        files.put(entries.create(id = 1, relativePath = "a.png", fingerprint = identical, fingerprintKind = FingerprintKind.IMAGE_DHASH))
        files.put(entries.create(id = 2, relativePath = "b.png", fingerprint = identical, fingerprintKind = FingerprintKind.IMAGE_DHASH))
        distant.forEachIndexed { index, hash ->
            files.put(
                entries.create(
                    id = index + 3L,
                    relativePath = "far$index.png",
                    fingerprint = hash,
                    fingerprintKind = FingerprintKind.IMAGE_DHASH,
                ),
            )
        }

        val groups = VisualSimilarityRule(files, maxBucket = 3).candidates()

        assertEquals(1, groups.size)
        assertEquals(setOf(1L, 2L), groups.single().members.map { it.first }.toSet())
        assertTrue(groups.single().confidence >= 0.5)
    }
}

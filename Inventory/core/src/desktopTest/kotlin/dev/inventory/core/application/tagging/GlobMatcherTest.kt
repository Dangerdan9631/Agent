package dev.inventory.core.application.tagging

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Verifies glob matching for single-segment and recursive wildcards.
 */
class GlobMatcherTest {
    @Test
    fun starMatchesWithinASegment() {
        val matcher = GlobMatcher("docs/*.txt")
        assertTrue(matcher.matches("docs/readme.txt"))
        assertFalse(matcher.matches("docs/nested/readme.txt"))
        assertFalse(matcher.matches("other/readme.txt"))
    }

    @Test
    fun doubleStarMatchesAcrossSegments() {
        val matcher = GlobMatcher("photos/**/*.jpg")
        assertTrue(matcher.matches("photos/2020/vacation.jpg"))
        assertTrue(matcher.matches("photos/vacation.jpg"))
        assertFalse(matcher.matches("photos/vacation.png"))
    }
}

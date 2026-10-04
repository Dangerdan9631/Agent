package dev.inventory.core.application.keeper

import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.support.FileEntries
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Verifies the four built-in keeper policies pick the documented member.
 */
class KeeperSelectionPolicyTest {
    private val files = FileEntries()
    private val older = files.create(id = 1, relativePath = "long/path/a.txt", modifiedAt = 10)
    private val newer = files.create(id = 2, relativePath = "b.txt", modifiedAt = 20, volumeId = 2)
    private val members = listOf(older, newer)
    private val volumes = mapOf(
        1L to Volume(1, "A", "/a", null),
        2L to Volume(2, "B", "/b", null),
    )

    @Test
    fun newestModifiedKeepsLatestTimestamp() {
        assertEquals(2L, NewestModifiedPolicy().choose(members, volumes).id)
    }

    @Test
    fun oldestModifiedKeepsEarliestTimestamp() {
        assertEquals(1L, OldestModifiedPolicy().choose(members, volumes).id)
    }

    @Test
    fun shortestPathKeepsShorterRelativePath() {
        assertEquals(2L, ShortestPathPolicy().choose(members, volumes).id)
    }

    @Test
    fun preferredVolumeKeepsTheEarlierVolume() {
        assertEquals(1L, PreferredVolumeOrderPolicy(listOf(1, 2)).choose(members, volumes).id)
        assertEquals(2L, PreferredVolumeOrderPolicy(listOf(2, 1)).choose(members, volumes).id)
    }
}

package dev.inventory.data.support

import dev.inventory.core.port.Clock

/**
 * Clock that returns a caller-controlled epoch millisecond value.
 */
class TestClock(
    private var epochMillis: Long = 1_700_000_000_000L,
) : Clock {
    override fun now(): Long = epochMillis

    /**
     * Advances the clock by deltaMillis and returns the new value.
     */
    fun advance(deltaMillis: Long): Long {
        epochMillis += deltaMillis
        return epochMillis
    }
}

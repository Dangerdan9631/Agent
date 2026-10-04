package dev.inventory.core.support

import dev.inventory.core.port.Clock

/**
 * Clock that returns a caller-controlled epoch millisecond value.
 */
class FixedClock(
    private var epochMillis: Long,
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

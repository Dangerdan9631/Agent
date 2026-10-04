package dev.inventory.data.time

import dev.inventory.core.port.Clock

/**
 * Clock that reads the JVM wall clock.
 */
class SystemClock : Clock {
    override fun now(): Long = System.currentTimeMillis()
}

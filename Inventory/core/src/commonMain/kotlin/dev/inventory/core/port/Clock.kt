package dev.inventory.core.port

/**
 * Source of the current wall-clock time so services can be tested deterministically.
 */
interface Clock {
    /**
     * Returns the current time in epoch milliseconds.
     */
    fun now(): Long
}

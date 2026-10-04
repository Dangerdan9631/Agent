package dev.inventory.app.platform

/**
 * Formats epoch timestamps for display in the user's local time zone.
 */
interface TimestampFormatter {
    /**
     * Returns a short local date-time string such as "2024-03-09 14:05".
     */
    fun format(epochMillis: Long): String
}

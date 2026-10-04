package dev.inventory.core.application.consolidation

/**
 * Converts epoch milliseconds into a UTC civil year and month without any platform date library.
 */
class EpochCalendar {
    /**
     * Returns the UTC year and 1-based month for the instant.
     */
    fun yearAndMonth(epochMillis: Long): Pair<Int, Int> {
        val days = epochMillis.floorDiv(MILLIS_PER_DAY)
        // Algorithm from Howard Hinnant's civil_from_days.
        val z = days + 719468
        val era = z.floorDiv(146097L)
        val doe = z - era * 146097
        val yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        val y = yoe + era * 400
        val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        val mp = (5 * doy + 2) / 153
        val month = (if (mp < 10) mp + 3 else mp - 9).toInt()
        val year = (if (month <= 2) y + 1 else y).toInt()
        return year to month
    }

    private companion object {
        const val MILLIS_PER_DAY = 86_400_000L
    }
}

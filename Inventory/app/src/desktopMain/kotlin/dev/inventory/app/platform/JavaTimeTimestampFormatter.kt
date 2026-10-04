package dev.inventory.app.platform

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * TimestampFormatter using java.time in the system default zone.
 */
class JavaTimeTimestampFormatter : TimestampFormatter {
    private val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault())

    override fun format(epochMillis: Long): String = formatter.format(Instant.ofEpochMilli(epochMillis))
}

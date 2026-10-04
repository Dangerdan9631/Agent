package dev.inventory.app.presentation.common

/**
 * Formats byte counts as short human readable strings.
 */
class ByteFormatter {
    /**
     * Returns a string such as "1.5 MB" or "320 B".
     */
    fun format(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        var value = bytes.toDouble()
        var unit = 0
        while (value >= 1024 && unit < UNITS.lastIndex) {
            value /= 1024
            unit++
        }
        val rounded = (value * 10).toLong() / 10.0
        val text = if (rounded == rounded.toLong().toDouble()) rounded.toLong().toString() else rounded.toString()
        return "$text ${UNITS[unit]}"
    }

    private companion object {
        val UNITS = listOf("B", "KB", "MB", "GB", "TB", "PB")
    }
}

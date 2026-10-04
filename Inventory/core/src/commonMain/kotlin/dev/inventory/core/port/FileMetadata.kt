package dev.inventory.core.port

/**
 * Human readable metadata extracted from a file for display and for date-based layout decisions.
 */
data class FileMetadata(
    /**
     * Ordered label/value pairs such as ("Camera", "Canon EOS") or ("Artist", "Someone").
     */
    val fields: List<Pair<String, String>>,
    /**
     * Capture or recording time in epoch milliseconds when the content embeds one, otherwise null.
     */
    val captureDate: Long?,
) {
    companion object {
        /**
         * Metadata for a file that has nothing extractable.
         */
        val EMPTY = FileMetadata(emptyList(), null)
    }
}

package dev.inventory.core.domain.file

/**
 * Whether a file was found on disk during the most recent scan of its volume.
 */
enum class FilePresence {
    /**
     * The file existed at its recorded path during the last scan.
     */
    PRESENT,

    /**
     * The file was recorded by an earlier scan but was not found by the latest one.
     */
    MISSING,
}

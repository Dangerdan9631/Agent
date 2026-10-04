package dev.inventory.core.domain.volume

/**
 * Lifecycle state of a volume scan.
 */
enum class ScanStatus {
    /**
     * The scan is still walking the volume.
     */
    RUNNING,

    /**
     * The scan finished and all counts are final.
     */
    COMPLETED,

    /**
     * The scan aborted because of an unrecoverable error.
     */
    FAILED,

    /**
     * The scan was cancelled by the user before finishing.
     */
    CANCELLED,
}

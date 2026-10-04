package dev.inventory.core.port

/**
 * One observation emitted while walking a directory tree.
 */
sealed interface WalkEvent {
    /**
     * A directory was entered; emitted before any of its children.
     */
    data class Directory(
        /**
         * Path relative to the walk root using forward slashes; empty for the root itself.
         */
        val relativePath: String,
    ) : WalkEvent

    /**
     * A regular file was found.
     */
    data class File(
        /**
         * Attributes of the file.
         */
        val file: ScannedFile,
    ) : WalkEvent

    /**
     * A path could not be read and was skipped.
     */
    data class Skipped(
        /**
         * Path relative to the walk root that could not be read.
         */
        val relativePath: String,
        /**
         * Short description of why it was skipped.
         */
        val reason: String,
    ) : WalkEvent
}

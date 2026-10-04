package dev.inventory.app.platform

/**
 * Hands paths to the operating system's file manager.
 */
interface PathOpener {
    /**
     * Opens the folder containing path in the system file manager; failures are logged and ignored.
     */
    fun revealInFileManager(path: String)
}

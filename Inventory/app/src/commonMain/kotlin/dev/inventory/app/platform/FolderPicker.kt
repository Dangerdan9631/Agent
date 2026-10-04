package dev.inventory.app.platform

/**
 * Native dialogs for choosing folders and save locations.
 */
interface FolderPicker {
    /**
     * Shows a folder chooser and returns the selected absolute path, or null when cancelled.
     */
    suspend fun pickFolder(title: String): String?

    /**
     * Shows a save-file chooser with a suggested name and returns the chosen absolute path, or null when cancelled.
     */
    suspend fun pickSaveFile(title: String, suggestedName: String): String?
}

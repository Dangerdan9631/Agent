package dev.inventory.data.paths

import java.nio.file.Path
import java.nio.file.Paths

/**
 * Resolves the per-user application data directory where the inventory database lives.
 */
class AppDataLocator(
    private val override: String? = System.getenv("INVENTORY_DATA_DIR"),
) {
    /**
     * Returns the directory for application data, honoring the INVENTORY_DATA_DIR override when set.
     */
    fun dataDirectory(): Path {
        override?.takeIf { it.isNotBlank() }?.let { return Paths.get(it) }
        val os = System.getProperty("os.name").lowercase()
        val home = System.getProperty("user.home")
        return when {
            os.contains("win") -> Paths.get(System.getenv("LOCALAPPDATA") ?: "$home\\AppData\\Local", APP_NAME)
            os.contains("mac") -> Paths.get(home, "Library", "Application Support", APP_NAME)
            else -> Paths.get(System.getenv("XDG_DATA_HOME") ?: "$home/.local/share", APP_NAME.lowercase())
        }
    }

    /**
     * Returns the path of the SQLite database file.
     */
    fun databaseFile(): Path = dataDirectory().resolve("inventory.db")

    private companion object {
        const val APP_NAME = "Inventory"
    }
}

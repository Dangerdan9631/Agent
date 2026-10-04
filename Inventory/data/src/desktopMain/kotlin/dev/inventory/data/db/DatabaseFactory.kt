package dev.inventory.data.db

import app.cash.sqldelight.db.QueryResult
import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import io.github.oshai.kotlinlogging.KotlinLogging
import java.nio.file.Files
import java.nio.file.Path
import java.util.Properties

/**
 * Opens the SQLite database file, creating or migrating the schema as needed.
 */
class DatabaseFactory(
    private val databaseFile: Path?,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Returns an open database bound to a tuned SQLite connection; callers own the lifetime.
     */
    fun open(): DatabaseHandle {
        val url = if (databaseFile == null) {
            JdbcSqliteDriver.IN_MEMORY
        } else {
            Files.createDirectories(databaseFile.toAbsolutePath().parent)
            "jdbc:sqlite:${databaseFile.toAbsolutePath()}"
        }
        logger.info { "Opening inventory database at $url" }
        val properties = Properties().apply {
            setProperty("foreign_keys", "true")
            setProperty("busy_timeout", "15000")
            if (databaseFile != null) {
                setProperty("journal_mode", "WAL")
                setProperty("synchronous", "NORMAL")
            }
        }
        val driver = JdbcSqliteDriver(url, properties)
        val currentVersion = driver.currentUserVersion()
        val targetVersion = InventoryDatabase.Schema.version
        if (currentVersion == 0L) {
            logger.info { "Creating schema version $targetVersion" }
            InventoryDatabase.Schema.create(driver)
            driver.setUserVersion(targetVersion)
        } else if (currentVersion < targetVersion) {
            logger.info { "Migrating schema from $currentVersion to $targetVersion" }
            InventoryDatabase.Schema.migrate(driver, currentVersion, targetVersion)
            driver.setUserVersion(targetVersion)
        }
        tune(driver)
        return DatabaseHandle(driver, InventoryDatabase(driver))
    }

    private fun tune(driver: JdbcSqliteDriver) {
        driver.execute(null, "PRAGMA cache_size = -262144;", 0)
        driver.execute(null, "PRAGMA temp_store = MEMORY;", 0)
        if (databaseFile != null) {
            driver.execute(null, "PRAGMA mmap_size = 1073741824;", 0)
        }
        listOf(
            "CREATE INDEX IF NOT EXISTS file_entry_present_size_quick_idx ON file_entry(size, quick_hash) WHERE presence = 'PRESENT' AND quick_hash IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS file_entry_present_full_hash_idx ON file_entry(full_hash) WHERE presence = 'PRESENT' AND full_hash IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS file_entry_present_name_size_idx ON file_entry(name, size) WHERE presence = 'PRESENT'",
            "CREATE INDEX IF NOT EXISTS file_entry_present_relative_path_idx ON file_entry(relative_path) WHERE presence = 'PRESENT'",
            "CREATE INDEX IF NOT EXISTS file_entry_fingerprint_pending_idx ON file_entry(kind) WHERE presence = 'PRESENT' AND fingerprint_attempted = 0",
        ).forEach { sql -> driver.execute(null, sql, 0) }
    }

    private fun JdbcSqliteDriver.currentUserVersion(): Long =
        executeQuery(null, "PRAGMA user_version;", { cursor ->
            QueryResult.Value(if (cursor.next().value) cursor.getLong(0) ?: 0L else 0L)
        }, 0).value

    private fun JdbcSqliteDriver.setUserVersion(version: Long) {
        execute(null, "PRAGMA user_version = $version;", 0)
    }
}

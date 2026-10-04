package dev.inventory.data.db

import app.cash.sqldelight.db.SqlDriver

/**
 * An open database together with the raw driver, which repositories need for dynamically built queries.
 */
class DatabaseHandle(
    /**
     * Low-level driver for raw SQL execution.
     */
    val driver: SqlDriver,
    /**
     * Generated typed query API.
     */
    val database: InventoryDatabase,
) : AutoCloseable {
    override fun close() {
        driver.close()
    }
}

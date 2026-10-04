package dev.inventory.data.db

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Runs database work on a single dedicated thread so SQLite never sees concurrent writers from this process.
 */
class DatabaseExecutor(
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO.limitedParallelism(1),
) {
    /**
     * Executes block on the database thread and returns its result.
     */
    suspend fun <T> run(block: () -> T): T = withContext(dispatcher) { block() }
}

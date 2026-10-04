package dev.inventory.data.repository

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.decision.FileDecision
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.File_decision
import dev.inventory.data.db.InventoryDatabase

/**
 * FileDecisionRepository backed by the SQLDelight file_decision table.
 */
class SqlDelightFileDecisionRepository(
    private val database: InventoryDatabase,
    private val executor: DatabaseExecutor,
) : FileDecisionRepository {
    private val queries get() = database.fileDecisionQueries

    override suspend fun forFiles(fileIds: Collection<Long>): Map<Long, FileDecision> = executor.run {
        fileIds.chunked(500)
            .flatMap { chunk -> queries.selectForFiles(chunk).executeAsList() }
            .associate { it.file_id to it.toDomain() }
    }

    override suspend fun set(fileIds: Collection<Long>, decision: Decision, note: String?, at: Long) = executor.run {
        database.transaction { fileIds.forEach { queries.upsertDecision(it, decision.name, note, at) } }
    }

    override suspend fun clear(fileIds: Collection<Long>) = executor.run {
        database.transaction { fileIds.forEach { queries.clearForFile(it) } }
    }

    override suspend fun allWith(decision: Decision): List<FileDecision> =
        executor.run { queries.selectAllWith(decision.name).executeAsList().map { it.toDomain() } }

    private fun File_decision.toDomain() = FileDecision(file_id, Decision.valueOf(decision), note, decided_at)
}

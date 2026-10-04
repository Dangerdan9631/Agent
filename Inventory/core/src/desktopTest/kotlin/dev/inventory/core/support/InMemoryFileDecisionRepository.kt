package dev.inventory.core.support

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.decision.FileDecision
import dev.inventory.core.port.FileDecisionRepository

/**
 * In-memory FileDecisionRepository used by core unit tests.
 */
class InMemoryFileDecisionRepository : FileDecisionRepository {
    private val rows = LinkedHashMap<Long, FileDecision>()

    override suspend fun forFiles(fileIds: Collection<Long>): Map<Long, FileDecision> =
        fileIds.mapNotNull { id -> rows[id]?.let { id to it } }.toMap()

    override suspend fun set(fileIds: Collection<Long>, decision: Decision, note: String?, at: Long) {
        fileIds.forEach { rows[it] = FileDecision(it, decision, note, at) }
    }

    override suspend fun clear(fileIds: Collection<Long>) {
        fileIds.forEach { rows.remove(it) }
    }

    override suspend fun allWith(decision: Decision): List<FileDecision> = rows.values.filter { it.decision == decision }
}

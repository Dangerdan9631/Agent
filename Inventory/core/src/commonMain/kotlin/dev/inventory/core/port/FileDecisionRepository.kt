package dev.inventory.core.port

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.decision.FileDecision

/**
 * Persistence for per-file consolidation decisions.
 */
interface FileDecisionRepository {
    /**
     * Returns the decisions recorded for the given files, omitting files that have none.
     */
    suspend fun forFiles(fileIds: Collection<Long>): Map<Long, FileDecision>

    /**
     * Records the same decision for every file, replacing any previous decision.
     */
    suspend fun set(fileIds: Collection<Long>, decision: Decision, note: String?, at: Long)

    /**
     * Removes the decision rows for the files so they become UNDECIDED.
     */
    suspend fun clear(fileIds: Collection<Long>)

    /**
     * Returns every decision row with the given decision.
     */
    suspend fun allWith(decision: Decision): List<FileDecision>
}

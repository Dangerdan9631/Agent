package dev.inventory.core.application.duplicates

import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.port.FileEntryRepository

/**
 * Groups present files that share a full content hash.
 */
class ExactDuplicateDetector(
    private val files: FileEntryRepository,
) {
    /**
     * Returns one EXACT candidate per shared full hash with two or more present files.
     */
    suspend fun detect(): List<DuplicateCandidate> {
        val found = ArrayList<DuplicateCandidate>()
        emit { found += it }
        return found
    }

    /**
     * Emits one EXACT candidate per shared full hash with two or more present files.
     */
    suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        files.forEachSharedFullHash { group ->
            if (group.size > 1) {
                onGroup(
                    DuplicateCandidate(
                        kind = DuplicateGroupKind.EXACT,
                        reason = REASON,
                        confidence = 1.0,
                        members = group.map { it.id to 1.0 },
                    ),
                )
            }
        }
    }

    companion object {
        /**
         * Reason code for identical content.
         */
        const val REASON = "same-content"
    }
}

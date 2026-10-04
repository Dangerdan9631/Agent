package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.application.duplicates.ProbableMatchRule
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.MatchFile

/**
 * Proposes files at the same relative path on different volumes whose content differs, the signature of a file edited after a backup.
 */
class PathTwinRule(
    private val files: FileEntryRepository,
) : ProbableMatchRule {
    override val reason: String = "path-twin"

    override suspend fun emit(onGroup: suspend (dev.inventory.core.application.duplicates.DuplicateCandidate) -> Unit) {
        files.forEachSharedRelativePath { group ->
            propose(group)?.let { onGroup(it) }
        }
    }

    override suspend fun emitTouching(file: MatchFile, onGroup: suspend (dev.inventory.core.application.duplicates.DuplicateCandidate) -> Unit) {
        propose(files.matchByRelativePath(file.relativePath))?.let { onGroup(it) }
    }

    private fun propose(group: List<MatchFile>) =
        if (group.map { it.volumeId }.toSet().size > 1 && !group.allIdentical()) group.toCandidate(reason, CONFIDENCE) else null

    private fun List<MatchFile>.allIdentical(): Boolean {
        val first = first()
        return all { it.size == first.size && it.quickHash != null && it.quickHash == first.quickHash }
    }

    private companion object {
        const val CONFIDENCE = 0.6
    }
}

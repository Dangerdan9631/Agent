package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.application.duplicates.DuplicateCandidate
import dev.inventory.core.application.duplicates.ProbableMatchRule
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.MatchFile
import kotlin.math.abs
import kotlin.math.max

/**
 * Proposes files with the same name whose sizes differ by a small fraction and whose modified times differ, suggesting an edited copy.
 */
class NameSizeToleranceRule(
    private val files: FileEntryRepository,
    private val tolerance: Double = 0.10,
    private val maxPerName: Int = 25,
) : ProbableMatchRule {
    override val reason: String = "name-size-tolerance"

    override suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        files.forEachSharedName(maxPerName) { sameName ->
            cluster(sameName).forEach { onGroup(it) }
        }
    }

    override suspend fun emitTouching(file: MatchFile, onGroup: suspend (DuplicateCandidate) -> Unit) {
        val sameName = files.matchByName(file.name, maxPerName)
        if (sameName.size < 2 || sameName.none { it.id == file.id }) return
        cluster(sameName).forEach { onGroup(it) }
    }

    private fun cluster(sameName: List<MatchFile>): List<DuplicateCandidate> {
        val sorted = sameName.sortedBy { it.size }
        val result = ArrayList<DuplicateCandidate>()
        var current = ArrayList<MatchFile>()
        for (file in sorted) {
            if (current.isEmpty() || withinTolerance(current.last(), file)) {
                current += file
            } else {
                result.addAll(emitCluster(current))
                current = arrayListOf(file)
            }
        }
        result.addAll(emitCluster(current))
        return result
    }

    private fun emitCluster(cluster: List<MatchFile>): List<DuplicateCandidate> {
        if (cluster.size < 2) return emptyList()
        val sizes = cluster.map { it.size }.toSet()
        val times = cluster.map { it.modifiedAt }.toSet()
        if (sizes.size < 2 || times.size < 2) return emptyList()
        return listOf(
            DuplicateCandidate(
                kind = DuplicateGroupKind.PROBABLE,
                reason = reason,
                confidence = 0.5,
                members = cluster.map { it.id to 0.5 },
            ),
        )
    }

    private fun withinTolerance(a: MatchFile, b: MatchFile): Boolean {
        val larger = max(a.size, b.size)
        if (larger == 0L) return true
        return abs(a.size - b.size).toDouble() / larger <= tolerance
    }
}

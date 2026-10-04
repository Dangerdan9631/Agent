package dev.inventory.core.application.duplicates

import dev.inventory.core.port.MatchFile

/**
 * One heuristic or fingerprint-based rule that proposes PROBABLE duplicate groups.
 */
interface ProbableMatchRule {
    /**
     * Stable reason code recorded on every group this rule produces.
     */
    val reason: String

    /**
     * True when the rule compares stored fingerprints rather than names, paths, or sizes.
     */
    val readsStoredFingerprints: Boolean
        get() = false

    /**
     * Emits each group this rule currently proposes. Each group has at least two members.
     */
    suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit)

    /**
     * Emits groups that include this newly observed file. Rules that only see the whole catalog leave this empty.
     */
    suspend fun emitTouching(file: MatchFile, onGroup: suspend (DuplicateCandidate) -> Unit) = Unit

    /**
     * Returns the groups this rule currently proposes; each must have at least two members.
     */
    suspend fun candidates(): List<DuplicateCandidate> {
        val found = ArrayList<DuplicateCandidate>()
        emit { found += it }
        return found
    }
}

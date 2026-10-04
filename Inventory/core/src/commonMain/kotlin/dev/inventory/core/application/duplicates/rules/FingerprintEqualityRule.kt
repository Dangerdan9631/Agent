package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.application.duplicates.DuplicateCandidate
import dev.inventory.core.application.duplicates.ProbableMatchRule
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.FileEntryRepository

/**
 * Proposes files whose fingerprints of one kind are exactly equal, used for normalized text, audio tags, and archive contents.
 */
class FingerprintEqualityRule(
    private val files: FileEntryRepository,
    /**
     * Fingerprint algorithm this rule compares.
     */
    val fingerprintKind: FingerprintKind,
    override val reason: String,
    private val confidence: Double,
) : ProbableMatchRule {
    override val readsStoredFingerprints: Boolean = true

    override suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        files.forEachSharedFingerprint(fingerprintKind) { group ->
            if (group.size > 1 && !group.allShareFullHash()) onGroup(group.toCandidate(reason, confidence))
        }
    }

    /**
     * Emits the group for one fingerprint value when at least two present files share it and their content is not already identical.
     */
    suspend fun emitValue(fingerprint: String, onGroup: suspend (DuplicateCandidate) -> Unit) {
        val group = files.matchByFingerprint(fingerprintKind, fingerprint)
        if (group.size > 1 && !group.allShareFullHash()) onGroup(group.toCandidate(reason, confidence))
    }
}

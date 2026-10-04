package dev.inventory.core.application.duplicates

import dev.inventory.core.application.duplicates.rules.FingerprintEqualityRule
import dev.inventory.core.application.duplicates.rules.VisualSimilarityRule
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.MatchFile
import io.github.oshai.kotlinlogging.KotlinLogging

/**
 * Runs every configured ProbableMatchRule and merges proposals that cover the same member set, keeping the strongest.
 */
class ProbableDuplicateDetector(
    private val rules: List<ProbableMatchRule>,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Returns PROBABLE candidates from all rules, de-duplicated by member set and excluding sets already covered by exact groups.
     */
    suspend fun detect(exactMemberKeys: Set<String>): List<DuplicateCandidate> {
        val byKey = LinkedHashMap<String, DuplicateCandidate>()
        emit(exactMemberKeys, includeFingerprintRules = true) { candidate ->
            val existing = byKey[candidate.memberKey]
            if (existing == null || candidate.confidence > existing.confidence) {
                byKey[candidate.memberKey] = candidate
            }
        }
        return byKey.values.toList()
    }

    /**
     * Emits proposals from the configured rules. Fingerprint rules are skipped when includeFingerprintRules is false.
     */
    suspend fun emit(
        exactMemberKeys: Set<String>,
        includeFingerprintRules: Boolean,
        onGroup: suspend (DuplicateCandidate) -> Unit,
    ) {
        for (rule in rules) {
            if (!includeFingerprintRules && rule.readsStoredFingerprints) continue
            var count = 0
            rule.emit { candidate ->
                if (candidate.members.size < 2) return@emit
                val exactKey = "EXACT:" + candidate.members.map { it.first }.sorted().joinToString(",")
                if (exactKey in exactMemberKeys) return@emit
                count++
                onGroup(candidate)
            }
            logger.info { "Rule ${rule.reason} proposed $count groups" }
        }
    }

    /**
     * Emits cheap proposals that include one newly written file.
     */
    suspend fun emitTouching(file: MatchFile, onGroup: suspend (DuplicateCandidate) -> Unit) {
        for (rule in rules) {
            if (rule.readsStoredFingerprints) continue
            rule.emitTouching(file) { candidate ->
                if (candidate.members.size >= 2) onGroup(candidate)
            }
        }
    }

    /**
     * Returns the visual similarity rule when one is configured.
     */
    fun visualRule(): VisualSimilarityRule? = rules.filterIsInstance<VisualSimilarityRule>().firstOrNull()

    /**
     * Emits the equality group for one freshly stored fingerprint, when a rule handles that kind.
     */
    suspend fun emitFingerprint(kind: FingerprintKind, fingerprint: String, onGroup: suspend (DuplicateCandidate) -> Unit) {
        for (rule in rules) {
            if (rule is FingerprintEqualityRule && rule.fingerprintKind == kind) {
                rule.emitValue(fingerprint, onGroup)
            }
        }
    }
}

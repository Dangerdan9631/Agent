package dev.inventory.core.application.duplicates

import dev.inventory.core.application.directory.DirectoryTreeHasher
import dev.inventory.core.application.fingerprint.FingerprintService
import dev.inventory.core.application.hashing.FullHashEscalation
import dev.inventory.core.application.hashing.WorkProgress
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.Clock
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.MatchFile
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Orchestrates duplicate detection so groups are saved as they are confirmed, including while a scan is still writing files.
 * A finished run drops open groups it did not see again. Cancelling keeps whatever was already saved.
 */
class DuplicateAnalysis(
    private val fullHashEscalation: FullHashEscalation,
    private val fingerprintService: FingerprintService,
    private val treeHasher: DirectoryTreeHasher,
    private val exactDetector: ExactDuplicateDetector,
    private val probableDetector: ProbableDuplicateDetector,
    private val folderDetector: FolderDuplicateDetector,
    private val groups: DuplicateGroupRepository,
    private val files: FileEntryRepository,
    private val volumes: VolumeRepository,
    private val clock: Clock,
    private val isScanActive: () -> Boolean = { false },
    private val pollDelayMillis: Long = 1_000,
    private val onWaitingForScan: suspend () -> Unit = {},
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Returns a cold flow that runs analysis when collected and emits progress, including a running count of saved groups.
     */
    fun run(): Flow<WorkProgress> = flow {
        val persister = GroupPersister(groups, clock, clock.now().let { if (it == 0L) 1L else it })
        var lastReported = 0L
        suspend fun report(phase: String, done: Long, total: Long?, current: String) {
            emit(WorkProgress(phase, done, total, current, persister.found))
            lastReported = persister.found
        }
        suspend fun save(phase: String, candidate: DuplicateCandidate) {
            persister.save(candidate)
            if (persister.found - lastReported >= REPORT_EVERY) report(phase, persister.found, null, candidate.reason)
        }

        logger.info { "Analysis ${persister.runId} started" }
        report("Matching names and paths", 0, null, "")
        probableDetector.emit(emptySet(), includeFingerprintRules = false) { save("Matching names and paths", it) }
        report("Matching names and paths", persister.found, persister.found, "")

        files.seedFullHashQueue()
        var hashDone = 0L
        var hashTotal = files.countFullHashQueue()
        var fingerprintDone = 0L
        var fingerprintTotal = files.countNeedingFingerprint(FINGERPRINT_KINDS)
        val visual = probableDetector.visualRule()

        while (true) {
            val inbox = files.claimAnalysisInbox(INBOX_BATCH)
            if (inbox.isNotEmpty()) {
                hashTotal += processInbox(inbox) { save("Matching names and paths", it) }
                files.deleteAnalysisInbox(inbox)
                fingerprintTotal = fingerprintDone + files.countNeedingFingerprint(FINGERPRINT_KINDS)
                report("Matching new files", inbox.size.toLong(), null, "")
            }

            val hashIds = files.claimFullHashQueue(HASH_BATCH)
            if (hashIds.isNotEmpty()) {
                val batch = files.byIds(hashIds)
                report("Hashing colliding files", hashDone, hashTotal, batch.firstOrNull()?.relativePath ?: "")
                val hashed = fullHashEscalation.hashBatch(batch)
                files.deleteFullHashQueue(hashIds)
                for (fullHash in hashed.map { it.second }.distinct()) {
                    val members = files.matchByFullHash(fullHash)
                    if (members.size > 1) save("Hashing colliding files", members.toExact())
                }
                hashDone += hashIds.size
                if (hashDone > hashTotal) hashTotal = hashDone
                report("Hashing colliding files", hashDone, hashTotal, batch.lastOrNull()?.relativePath ?: "")
            }

            val fingerprintBatch = files.needingFingerprint(FINGERPRINT_KINDS, FINGERPRINT_BATCH)
            if (fingerprintBatch.isNotEmpty()) {
                report("Fingerprinting", fingerprintDone, fingerprintTotal, fingerprintBatch.first().relativePath)
                val stored = fingerprintService.fingerprintBatch(fingerprintBatch)
                for (item in stored) {
                    val value = item.fingerprint ?: continue
                    val kind = item.kind ?: continue
                    probableDetector.emitFingerprint(kind, value) { save("Fingerprinting", it) }
                    if (kind == FingerprintKind.IMAGE_DHASH) visual?.observe(item.fileId, value) { save("Fingerprinting", it) }
                }
                fingerprintDone += fingerprintBatch.size
                if (fingerprintDone > fingerprintTotal) fingerprintTotal = fingerprintDone
                report("Fingerprinting", fingerprintDone, fingerprintTotal, fingerprintBatch.last().relativePath)
            }

            val busy = inbox.isNotEmpty() || hashIds.isNotEmpty() || fingerprintBatch.isNotEmpty()
            if (busy) continue
            if (isScanActive()) {
                onWaitingForScan()
                if (isScanActive()) {
                    report("Waiting for scan", hashDone, hashTotal, "")
                    delay(pollDelayMillis)
                }
                continue
            }
            if (visual != null && !visual.ready) {
                report("Detecting visual matches", 0, null, "")
                visual.prepare { save("Detecting visual matches", it) }
                report("Detecting visual matches", persister.found, null, "")
                continue
            }
            finish(persister) { phase, done, total, current -> report(phase, done, total, current) }
            if (isScanActive() || files.countAnalysisInbox() > 0 || files.countFullHashQueue() > 0) continue
            break
        }

        val pruned = groups.deleteGroupsWithMissingMembers()
        logger.info { "Analysis ${persister.runId} complete with ${persister.found} updated groups; pruned $pruned groups with missing members" }
        report("Completed", 1, 1, "")
    }

    private suspend fun processInbox(ids: List<Long>, save: suspend (DuplicateCandidate) -> Unit): Long {
        var queued = 0L
        for (id in ids) {
            val file = files.byId(id) ?: continue
            if (file.presence != FilePresence.PRESENT) continue
            val quickHash = file.quickHash
            if (quickHash != null && file.size > 0) queued += files.enqueueFullHashCollisions(file.size, quickHash)
            probableDetector.emitTouching(file.toMatch(), save)
        }
        return queued
    }

    private suspend fun finish(
        persister: GroupPersister,
        report: suspend (String, Long, Long?, String) -> Unit,
    ) {
        groups.clearOpenConfirmation()
        report("Confirming exact duplicates", 0, null, "")
        val exactKeys = HashSet<String>()
        exactDetector.emit { candidate ->
            exactKeys += candidate.memberKey
            persister.save(candidate)
        }
        report("Confirming probable duplicates", 0, null, "")
        probableDetector.emit(exactKeys, includeFingerprintRules = true) { persister.save(it) }
        val allVolumes = volumes.all()
        allVolumes.forEachIndexed { index, volume ->
            report("Hashing directory trees", index.toLong(), allVolumes.size.toLong(), volume.label)
            treeHasher.rebuild(volume.id)
            folderDetector.emit { persister.save(it) }
        }
        if (isScanActive()) {
            logger.info { "Scan started during confirmation; leaving open groups in place" }
            return
        }
        val removed = groups.deleteOpenUnconfirmed(persister.runId)
        logger.info { "Removed $removed open groups that were not confirmed by run ${persister.runId}" }
    }

    private companion object {
        const val HASH_BATCH = 200
        const val FINGERPRINT_BATCH = 40
        const val INBOX_BATCH = 200
        const val REPORT_EVERY = 25L
        val FINGERPRINT_KINDS = setOf(
            dev.inventory.core.domain.file.FileKind.DOCUMENT,
            dev.inventory.core.domain.file.FileKind.SOURCE,
            dev.inventory.core.domain.file.FileKind.IMAGE,
            dev.inventory.core.domain.file.FileKind.AUDIO,
            dev.inventory.core.domain.file.FileKind.ARCHIVE,
            dev.inventory.core.domain.file.FileKind.OTHER,
        )
    }
}

private fun FileEntry.toMatch() = MatchFile(id, volumeId, relativePath, name, size, modifiedAt, quickHash, fullHash, fingerprint)

private fun List<MatchFile>.toExact() = DuplicateCandidate(
    kind = DuplicateGroupKind.EXACT,
    reason = ExactDuplicateDetector.REASON,
    confidence = 1.0,
    members = map { it.id to 1.0 },
)

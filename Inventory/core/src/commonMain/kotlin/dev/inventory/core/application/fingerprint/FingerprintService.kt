package dev.inventory.core.application.fingerprint

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

/**
 * One stored fingerprint attempt, including a copied value or a failed read.
 */
data class StoredFingerprint(
    /**
     * File that was examined.
     */
    val fileId: Long,
    /**
     * Fingerprint text, or null when the file could not be fingerprinted.
     */
    val fingerprint: String?,
    /**
     * Algorithm that produced the fingerprint, or null when there is no value.
     */
    val kind: FingerprintKind?,
)

/**
 * Computes type-specific fingerprints for present files that have not been attempted yet.
 * Files that share a full hash reuse a fingerprint that was already stored for that content.
 */
class FingerprintService(
    private val files: FileEntryRepository,
    private val volumes: VolumeRepository,
    private val fileSystem: FileSystemPort,
    private val registry: FingerprinterRegistry,
    private val parallelism: Int = 4,
    private val maxFileSize: Long = 256L * 1024 * 1024,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Fingerprints the batch, copying results across identical full hashes, and returns every attempt.
     */
    suspend fun fingerprintBatch(batch: List<FileEntry>): List<StoredFingerprint> {
        if (batch.isEmpty()) return emptyList()
        val copiedIds = files.copyFingerprintsFromSiblings(batch.map { it.id }).toSet()
        val stored = ArrayList<StoredFingerprint>()
        for (id in copiedIds) {
            val updated = files.byId(id)
            stored += StoredFingerprint(id, updated?.fingerprint, updated?.fingerprintKind)
        }
        val pending = batch.filter { it.id !in copiedIds }
        val representatives = ArrayList<FileEntry>()
        val clones = ArrayList<Pair<Long, Long>>()
        for ((hash, group) in pending.groupBy { it.fullHash }) {
            if (hash == null || group.size == 1) {
                representatives += group
            } else {
                representatives += group.first()
                group.drop(1).forEach { clones += it.id to group.first().id }
            }
        }
        val computed = compute(representatives)
        val byId = computed.associateBy { it.fileId }
        val updates = ArrayList<StoredFingerprint>(computed.size + clones.size)
        updates += computed
        for ((cloneId, representativeId) in clones) {
            val source = byId[representativeId]
            updates += StoredFingerprint(cloneId, source?.fingerprint, source?.kind)
        }
        if (updates.isNotEmpty()) {
            files.updateFingerprints(updates.map { Triple(it.fileId, it.fingerprint, it.kind) })
        }
        logger.debug { "Fingerprinted ${updates.size} files, copied ${copiedIds.size}" }
        return stored + updates
    }

    private suspend fun compute(batch: List<FileEntry>): List<StoredFingerprint> {
        if (batch.isEmpty()) return emptyList()
        val roots = volumes.all().associateBy(Volume::id)
        val semaphore = Semaphore(parallelism)
        return coroutineScope {
            batch.map { file ->
                async {
                    semaphore.withPermit { fingerprintOne(file, roots) }
                }
            }.awaitAll()
        }
    }

    private suspend fun fingerprintOne(file: FileEntry, roots: Map<Long, Volume>): StoredFingerprint {
        val fingerprinter = registry.select(file)
        val root = roots[file.volumeId]?.rootPath
        if (fingerprinter == null || root == null || file.size > maxFileSize) {
            return StoredFingerprint(file.id, null, null)
        }
        val value = try {
            fingerprinter.fingerprint(fileSystem.resolve(root, file.relativePath))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.debug { "Fingerprint ${fingerprinter.kind} failed for ${file.relativePath}: ${e.message}" }
            null
        }
        return StoredFingerprint(file.id, value, if (value == null) null else fingerprinter.kind)
    }
}

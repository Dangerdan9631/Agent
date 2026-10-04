package dev.inventory.core.application.scanning

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKindClassifier
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.domain.volume.Scan
import dev.inventory.core.domain.volume.ScanStatus
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.Clock
import dev.inventory.core.port.ContentHasher
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileObservation
import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.ScanRepository
import dev.inventory.core.port.ScannedFile
import dev.inventory.core.port.VolumeRepository
import dev.inventory.core.port.WalkEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

/**
 * Walks a volume, records new and changed files with quick hashes, marks vanished files missing, and logs a scan row.
 */
class VolumeScanner(
    private val fileSystem: FileSystemPort,
    private val hasher: ContentHasher,
    private val classifier: FileKindClassifier,
    private val files: FileEntryRepository,
    private val scans: ScanRepository,
    private val volumes: VolumeRepository,
    private val clock: Clock,
    private val settings: ScanSettings,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Returns a cold flow that performs the scan when collected and emits progress snapshots until it completes.
     */
    fun scan(volume: Volume): Flow<ScanProgress> = flow {
        val scan = scans.start(volume.id, clock.now())
        logger.info { "Scan ${scan.id} started for volume ${volume.id} (${volume.label}) at ${volume.rootPath} with hashParallelism=${settings.hashParallelism} batchSize=${settings.batchSize}" }
        val counters = Counters()
        val pendingWalk = ArrayList<ScannedFile>(settings.batchSize)
        val pendingNew = ArrayList<ScannedFile>(settings.batchSize)
        val pendingChanged = ArrayList<Pair<ScannedFile, FileObservation>>(settings.batchSize)
        val pendingSeen = ArrayList<Long>(settings.batchSize * 4)
        val semaphore = Semaphore(settings.hashParallelism)

        suspend fun flushSeen() {
            if (pendingSeen.isEmpty()) return
            files.markSeen(pendingSeen.toList(), scan.id)
            pendingSeen.clear()
        }

        suspend fun flushNew() {
            if (pendingNew.isEmpty()) return
            val entries = hashAll(pendingNew, volume, scan.id, semaphore, counters)
            files.insertAll(entries)
            pendingNew.clear()
        }

        suspend fun flushChanged() {
            if (pendingChanged.isEmpty()) return
            val entries = hashAll(pendingChanged.map { it.first }, volume, scan.id, semaphore, counters)
            val byPath = pendingChanged.associate { it.first.relativePath to it.second.id }
            files.updateChanged(entries.map { it.copy(id = byPath.getValue(it.relativePath)) })
            pendingChanged.clear()
        }

        suspend fun drainWalked() {
            if (pendingWalk.isEmpty()) return
            val known = files.observationsForPaths(volume.id, pendingWalk.map { it.relativePath })
            for (f in pendingWalk) {
                counters.filesSeen++
                counters.bytesSeen += f.size
                counters.currentPath = f.relativePath
                val previous = known[f.relativePath]
                when {
                    previous == null -> {
                        counters.newFiles++
                        pendingNew += f
                        if (pendingNew.size >= settings.batchSize) flushNew()
                    }
                    previous.size != f.size || previous.modifiedAt != f.modifiedAt || previous.quickHash == null -> {
                        counters.changedFiles++
                        pendingChanged += f to previous
                        if (pendingChanged.size >= settings.batchSize) flushChanged()
                    }
                    else -> {
                        pendingSeen += previous.id
                        if (pendingSeen.size >= settings.batchSize * 4) flushSeen()
                    }
                }
            }
            pendingWalk.clear()
        }

        try {
            fileSystem.walk(volume.rootPath, settings.excludedDirectoryNames).collect { event ->
                when (event) {
                    is WalkEvent.Directory -> Unit
                    is WalkEvent.Skipped -> {
                        counters.skipped++
                        logger.debug { "Skipped ${event.relativePath}: ${event.reason}" }
                    }
                    is WalkEvent.File -> {
                        counters.currentPath = event.file.relativePath
                        pendingWalk += event.file
                        if (pendingWalk.size >= settings.batchSize) {
                            drainWalked()
                            emit(counters.snapshot(scan.id, "Walking"))
                        }
                    }
                }
            }
            drainWalked()
            emit(counters.snapshot(scan.id, "Hashing remaining files"))
            flushNew()
            flushChanged()
            flushSeen()
            emit(counters.snapshot(scan.id, "Finalizing"))
            val missing = files.markMissingNotSeenBy(volume.id, scan.id)
            val finished = clock.now()
            scans.finish(scan.completed(finished, counters, missing))
            volumes.markScanned(volume.id, finished)
            logger.info { "Scan ${scan.id} completed: ${counters.filesSeen} files, ${counters.bytesSeen} bytes, ${counters.newFiles} new, ${counters.changedFiles} changed, $missing missing, ${counters.skipped} skipped" }
            emit(counters.snapshot(scan.id, "Completed"))
        } catch (e: CancellationException) {
            logger.info { "Scan ${scan.id} cancelled after ${counters.filesSeen} files" }
            scans.finish(scan.completed(clock.now(), counters, 0).copy(status = ScanStatus.CANCELLED))
            throw e
        } catch (e: Exception) {
            logger.error(e) { "Scan ${scan.id} failed" }
            scans.finish(scan.completed(clock.now(), counters, 0).copy(status = ScanStatus.FAILED, error = e.message ?: e::class.simpleName))
            throw e
        }
    }

    private suspend fun hashAll(
        batch: List<ScannedFile>,
        volume: Volume,
        scanId: Long,
        semaphore: Semaphore,
        counters: Counters,
    ): List<FileEntry> = coroutineScope {
        batch.map { f ->
            async {
                semaphore.withPermit {
                    val path = fileSystem.resolve(volume.rootPath, f.relativePath)
                    val quickHash = try {
                        hasher.quickHash(path, f.size)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        logger.warn { "Could not hash ${f.relativePath}: ${e.message}" }
                        null
                    }
                    val extension = extensionOf(f.name)
                    FileEntry(
                        id = 0,
                        volumeId = volume.id,
                        relativePath = f.relativePath,
                        name = f.name,
                        extension = extension,
                        kind = classifier.classify(extension),
                        size = f.size,
                        modifiedAt = f.modifiedAt,
                        createdAt = f.createdAt,
                        quickHash = quickHash,
                        fullHash = null,
                        fingerprint = null,
                        fingerprintKind = null,
                        presence = FilePresence.PRESENT,
                        lastSeenScanId = scanId,
                    )
                }
            }
        }.awaitAll().also { counters.hashed += it.size }
    }

    private fun extensionOf(name: String): String {
        val dot = name.lastIndexOf('.')
        return if (dot <= 0 || dot == name.length - 1) "" else name.substring(dot + 1).lowercase()
    }

    private fun Scan.completed(finishedAt: Long, counters: Counters, missing: Long): Scan = copy(
        finishedAt = finishedAt,
        status = ScanStatus.COMPLETED,
        fileCount = counters.filesSeen,
        byteCount = counters.bytesSeen,
        newCount = counters.newFiles,
        changedCount = counters.changedFiles,
        missingCount = missing,
        error = null,
    )

    private class Counters {
        var filesSeen = 0L
        var bytesSeen = 0L
        var newFiles = 0L
        var changedFiles = 0L
        var hashed = 0L
        var skipped = 0L
        var currentPath = ""

        fun snapshot(scanId: Long, phase: String) =
            ScanProgress(scanId, filesSeen, bytesSeen, newFiles, changedFiles, hashed, skipped, currentPath, phase)
    }

}

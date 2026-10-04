package dev.inventory.core.application.hashing

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.ContentHasher
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
 * Computes full SHA-256 hashes for files whose size and quick hash collide with another file.
 */
class FullHashEscalation(
    private val files: FileEntryRepository,
    private val volumes: VolumeRepository,
    private val fileSystem: FileSystemPort,
    private val hasher: ContentHasher,
    private val parallelism: Int = 4,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Hashes the batch in parallel and stores the successes in one transaction. Returns id to hash for every file that could be read.
     */
    suspend fun hashBatch(batch: List<FileEntry>): List<Pair<Long, String>> {
        if (batch.isEmpty()) return emptyList()
        val roots = volumes.all().associateBy(Volume::id)
        val semaphore = Semaphore(parallelism)
        val results = coroutineScope {
            batch.map { file ->
                async {
                    semaphore.withPermit { hashOne(file, roots) }
                }
            }.awaitAll()
        }
        val hashed = results.mapNotNull { (id, hash) -> hash?.let { id to it } }
        if (hashed.isNotEmpty()) files.updateFullHashes(hashed)
        return hashed
    }

    private suspend fun hashOne(file: FileEntry, roots: Map<Long, Volume>): Pair<Long, String?> {
        val root = roots[file.volumeId]?.rootPath ?: return file.id to null
        return try {
            file.id to hasher.fullHash(fileSystem.resolve(root, file.relativePath))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            logger.warn { "Full hash failed for ${file.relativePath}: ${e.message}" }
            file.id to null
        }
    }
}

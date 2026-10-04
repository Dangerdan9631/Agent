package dev.inventory.core.application.duplicates

import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.port.DirectoryEntryRepository

/**
 * Groups directories with identical tree hashes, reporting only the outermost matching directories.
 */
class FolderDuplicateDetector(
    private val directories: DirectoryEntryRepository,
) {
    /**
     * Returns one FOLDER candidate per shared tree hash, omitting groups whose parents already match as a group.
     */
    suspend fun detect(): List<DuplicateCandidate> {
        val found = ArrayList<DuplicateCandidate>()
        emit { found += it }
        return found
    }

    /**
     * Emits one FOLDER candidate per shared tree hash, omitting groups whose parents already match as a group.
     */
    suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        val shared = ArrayList<DirectoryEntry>()
        directories.forEachSharedTreeHash { shared += it }
        val hashByLocation = shared.associate { (it.volumeId to it.relativePath) to it.treeHash }
        shared.groupBy { it.treeHash!! }.values
            .filter { group -> group.size > 1 && !nestedInMatchingParents(group, hashByLocation) }
            .forEach { group ->
                onGroup(
                    DuplicateCandidate(
                        kind = DuplicateGroupKind.FOLDER,
                        reason = REASON,
                        confidence = 0.95,
                        members = group.map { it.id to 1.0 },
                    ),
                )
            }
    }

    private fun nestedInMatchingParents(group: List<DirectoryEntry>, hashByLocation: Map<Pair<Long, String>, String?>): Boolean {
        val parentHashes = group.map { dir ->
            if (dir.relativePath.isEmpty()) return false
            hashByLocation[dir.volumeId to dir.relativePath.substringBeforeLast('/', "")] ?: return false
        }
        return parentHashes.toSet().size == 1
    }

    companion object {
        /**
         * Reason code for identical directory trees.
         */
        const val REASON = "tree-hash"
    }
}

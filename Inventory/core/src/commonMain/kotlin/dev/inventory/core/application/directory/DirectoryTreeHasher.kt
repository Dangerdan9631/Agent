package dev.inventory.core.application.directory

import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.port.DirectoryEntryRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.PresentFileContent
import dev.inventory.core.port.TextDigest
import io.github.oshai.kotlinlogging.KotlinLogging

/**
 * Rebuilds the Merkle tree hashes of every directory on a volume from the hashes of the files beneath it.
 * Files are read in path order so only the directories on the current path stay in memory.
 */
class DirectoryTreeHasher(
    private val files: FileEntryRepository,
    private val directories: DirectoryEntryRepository,
    private val digest: TextDigest,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Recomputes and replaces every directory row of the volume; returns the number of directories written.
     */
    suspend fun rebuild(volumeId: Long): Int {
        val stack = ArrayDeque<Node>()
        stack.add(Node(""))
        val entries = ArrayList<DirectoryEntry>()
        var after = ""
        while (true) {
            val page = files.presentContentAfter(volumeId, after, PAGE)
            if (page.isEmpty()) break
            for (file in page) accept(stack, file, volumeId, entries)
            after = page.last().relativePath
            if (page.size < PAGE) break
        }
        while (stack.isNotEmpty()) entries += finish(stack, volumeId)
        directories.replaceForVolume(volumeId, entries)
        logger.info { "Rebuilt ${entries.size} directory hashes for volume $volumeId" }
        return entries.size
    }

    private fun accept(stack: ArrayDeque<Node>, file: PresentFileContent, volumeId: Long, entries: MutableList<DirectoryEntry>) {
        val parent = file.relativePath.substringBeforeLast('/', "")
        while (stack.isNotEmpty() && !contains(stack.last().path, parent)) {
            entries += finish(stack, volumeId)
        }
        ensure(stack, parent)
        val node = stack.last()
        val contentHash = file.fullHash ?: file.quickHash
        node.fileLines += "f:${file.name}:${file.size}:${contentHash ?: "?"}"
        if (contentHash == null) node.incomplete = true
        node.fileCount += 1
        node.byteCount += file.size
    }

    private fun ensure(stack: ArrayDeque<Node>, parent: String) {
        val current = stack.last().path
        if (parent == current) return
        val suffix = if (current.isEmpty()) parent else parent.removePrefix("$current/")
        var path = current
        for (segment in suffix.split('/')) {
            if (segment.isEmpty()) continue
            path = if (path.isEmpty()) segment else "$path/$segment"
            stack.add(Node(path))
        }
    }

    private fun finish(stack: ArrayDeque<Node>, volumeId: Long): DirectoryEntry {
        val done = stack.removeLast()
        val lines = ArrayList<String>(done.fileLines.size + done.childLines.size)
        lines += done.fileLines
        lines += done.childLines
        lines.sort()
        val treeHash = if (done.incomplete || done.fileCount == 0L) null else digest.sha256Hex(lines.joinToString("\n"))
        if (stack.isNotEmpty()) {
            val parent = stack.last()
            parent.childLines += "d:${done.path.substringAfterLast('/')}:${treeHash ?: "?"}"
            if (done.incomplete) parent.incomplete = true
            parent.fileCount += done.fileCount
            parent.byteCount += done.byteCount
        }
        return DirectoryEntry(0, volumeId, done.path, treeHash, done.fileCount, done.byteCount)
    }

    private fun contains(dir: String, parent: String): Boolean {
        if (dir.isEmpty()) return true
        return parent == dir || parent.startsWith("$dir/")
    }

    private class Node(val path: String) {
        val fileLines = ArrayList<String>()
        val childLines = ArrayList<String>()
        var fileCount = 0L
        var byteCount = 0L
        var incomplete = false
    }

    private companion object {
        const val PAGE = 2000
    }
}

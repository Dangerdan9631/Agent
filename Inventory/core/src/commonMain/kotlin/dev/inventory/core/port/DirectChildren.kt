package dev.inventory.core.port

import dev.inventory.core.domain.file.FileEntry

/**
 * An immediate child folder under a volume root or directory path in the browser tree.
 */
data class BrowserFolderNode(
    /**
     * Folder name (last segment).
     */
    val name: String,
    /**
     * Path relative to the volume root using forward slashes.
     */
    val relativePath: String,
)

/**
 * Immediate children of a directory in the browser tree for one volume.
 */
data class DirectChildren(
    /**
     * Child folders that contain at least one file matching the active query.
     */
    val folders: List<BrowserFolderNode>,
    /**
     * Files directly in this directory that match the active query.
     */
    val files: List<FileEntry>,
)

/**
 * Derives browser tree children from paths and file rows under a parent directory.
 */
object DirectChildrenResolver {
    /**
     * Builds sorted direct children from every matching file on the volume.
     */
    fun fromMatchingFiles(parentPath: String, matching: List<FileEntry>): DirectChildren {
        val folders = LinkedHashMap<String, BrowserFolderNode>()
        val files = ArrayList<FileEntry>()
        for (entry in matching) {
            val remainder = remainderUnderParent(parentPath, entry.relativePath) ?: continue
            if (remainder.contains('/')) {
                val name = remainder.substringBefore('/')
                val folderPath = if (parentPath.isEmpty()) name else "$parentPath/$name"
                folders.putIfAbsent(folderPath, BrowserFolderNode(name, folderPath))
            } else {
                files += entry
            }
        }
        return DirectChildren(
            folders = folders.values.sortedBy { it.name.lowercase() },
            files = files.sortedBy { it.name.lowercase() },
        )
    }

    /**
     * Builds folder nodes from relative paths of deeper matches (used when files are loaded separately).
     */
    fun foldersFromRelativePaths(parentPath: String, relativePaths: Iterable<String>): List<BrowserFolderNode> {
        val folders = LinkedHashMap<String, BrowserFolderNode>()
        for (path in relativePaths) {
            val remainder = remainderUnderParent(parentPath, path) ?: continue
            if (!remainder.contains('/')) continue
            val name = remainder.substringBefore('/')
            val folderPath = if (parentPath.isEmpty()) name else "$parentPath/$name"
            folders.putIfAbsent(folderPath, BrowserFolderNode(name, folderPath))
        }
        return folders.values.sortedBy { it.name.lowercase() }
    }

    internal fun remainderUnderParent(parentPath: String, relativePath: String): String? {
        if (parentPath.isEmpty()) return relativePath
        if (!relativePath.startsWith("$parentPath/")) return null
        return relativePath.removePrefix("$parentPath/")
    }
}

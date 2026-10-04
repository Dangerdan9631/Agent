package dev.inventory.core.port

import kotlinx.coroutines.flow.Flow

/**
 * Filesystem operations needed by scanning and consolidation, expressed over platform-native absolute path strings.
 */
interface FileSystemPort {
    /**
     * Returns a cold flow that walks the tree beneath root depth-first, emits directories before their children, and does not descend into directories whose name is in excludedDirectoryNames (case-insensitive).
     */
    fun walk(root: String, excludedDirectoryNames: Set<String>): Flow<WalkEvent>

    /**
     * Returns the native absolute path formed by joining a forward-slash relative path onto root.
     */
    fun resolve(root: String, relativePath: String): String

    /**
     * Returns true when path is the same as, or nested anywhere beneath, root after normalization.
     */
    fun isInside(path: String, root: String): Boolean

    /**
     * Returns true when a regular file or directory exists at path.
     */
    suspend fun exists(path: String): Boolean

    /**
     * Returns true when path exists and is a directory.
     */
    suspend fun isDirectory(path: String): Boolean

    /**
     * Returns the size in bytes of the regular file at path, or null when it does not exist.
     */
    suspend fun size(path: String): Long?

    /**
     * Creates the directory at path and any missing parents; succeeds silently if it already exists.
     */
    suspend fun createDirectories(path: String)

    /**
     * Returns the deterministic temporary sibling path that copyToTemporary writes for destination.
     */
    fun temporaryPathFor(destination: String): String

    /**
     * Copies source to temporaryPathFor(destination), replacing any partial file there, and returns that temporary path.
     */
    suspend fun copyToTemporary(source: String, destination: String): String

    /**
     * Atomically renames temporaryPath to destination, failing if destination already exists.
     */
    suspend fun moveIntoPlace(temporaryPath: String, destination: String)

    /**
     * Deletes the regular file at path; succeeds silently if it does not exist.
     */
    suspend fun deleteFile(path: String)

    /**
     * Reads at most maxBytes from the start of the file at path.
     */
    suspend fun readHead(path: String, maxBytes: Int): ByteArray

    /**
     * Writes text to path with UTF-8 encoding, replacing any existing file.
     */
    suspend fun writeText(path: String, text: String)
}

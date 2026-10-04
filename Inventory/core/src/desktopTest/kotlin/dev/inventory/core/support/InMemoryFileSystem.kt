package dev.inventory.core.support

import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.ScannedFile
import dev.inventory.core.port.WalkEvent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Map-backed FileSystemPort used by consolidation executor tests.
 */
class InMemoryFileSystem : FileSystemPort {
    private val files = LinkedHashMap<String, ByteArray>()
    private val directories = HashSet<String>()

    /**
     * Stores the bytes of a regular file at the given path.
     */
    fun putFile(path: String, content: ByteArray) {
        files[normalize(path)] = content
        parent(path)?.let { directories += it }
    }

    /**
     * Returns the stored bytes at path, or null when the file is absent.
     */
    fun bytes(path: String): ByteArray? = files[normalize(path)]

    override fun walk(root: String, excludedDirectoryNames: Set<String>): Flow<WalkEvent> = flow {
        val prefix = normalize(root).trimEnd('/')
        files.keys.filter { it == prefix || it.startsWith("$prefix/") }.sorted().forEach { path ->
            val relative = if (path == prefix) "" else path.removePrefix("$prefix/")
            val name = relative.substringAfterLast('/')
            val content = files.getValue(path)
            emit(WalkEvent.File(ScannedFile(relative, name, content.size.toLong(), 0, null)))
        }
    }

    override fun resolve(root: String, relativePath: String): String {
        if (relativePath.isEmpty()) return normalize(root)
        return normalize("${normalize(root).trimEnd('/')}/$relativePath")
    }

    override fun isInside(path: String, root: String): Boolean {
        val p = normalize(path)
        val r = normalize(root).trimEnd('/')
        return p == r || p.startsWith("$r/")
    }

    override suspend fun exists(path: String): Boolean = normalize(path) in files || normalize(path) in directories

    override suspend fun isDirectory(path: String): Boolean = normalize(path) in directories

    override suspend fun size(path: String): Long? = files[normalize(path)]?.size?.toLong()

    override suspend fun createDirectories(path: String) {
        directories += normalize(path)
    }

    override fun temporaryPathFor(destination: String): String = normalize(destination) + ".inventory-tmp"

    override suspend fun copyToTemporary(source: String, destination: String): String {
        val src = files[normalize(source)] ?: error("missing source $source")
        val temporary = temporaryPathFor(destination)
        parent(destination)?.let { directories += it }
        files[temporary] = src.copyOf()
        return temporary
    }

    override suspend fun moveIntoPlace(temporaryPath: String, destination: String) {
        val dest = normalize(destination)
        require(dest !in files) { "destination exists" }
        val bytes = files.remove(normalize(temporaryPath)) ?: error("missing temporary $temporaryPath")
        files[dest] = bytes
    }

    override suspend fun deleteFile(path: String) {
        files.remove(normalize(path))
    }

    override suspend fun readHead(path: String, maxBytes: Int): ByteArray =
        files[normalize(path)]?.copyOf(minOf(maxBytes, files.getValue(normalize(path)).size)) ?: ByteArray(0)

    override suspend fun writeText(path: String, text: String) {
        putFile(path, text.encodeToByteArray())
    }

    private fun normalize(path: String): String = path.replace('\\', '/').trimEnd('/').ifEmpty { "/" }

    private fun parent(path: String): String? {
        val normalized = normalize(path)
        val slash = normalized.lastIndexOf('/')
        return if (slash <= 0) null else normalized.substring(0, slash)
    }
}

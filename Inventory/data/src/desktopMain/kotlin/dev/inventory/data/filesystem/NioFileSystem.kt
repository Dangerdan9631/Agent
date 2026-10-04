package dev.inventory.data.filesystem

import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.ScannedFile
import dev.inventory.core.port.WalkEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.ProducerScope
import kotlinx.coroutines.channels.trySendBlocking
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.buffer
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.io.IOException
import java.nio.file.FileVisitOption
import java.nio.file.FileVisitResult
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.SimpleFileVisitor
import java.nio.file.StandardCopyOption
import java.nio.file.attribute.BasicFileAttributes
import java.util.EnumSet

/**
 * FileSystemPort implemented over java.nio.file.
 */
class NioFileSystem : FileSystemPort {
    private val logger = KotlinLogging.logger {}

    override fun walk(root: String, excludedDirectoryNames: Set<String>): Flow<WalkEvent> = channelFlow {
        val rootPath = Paths.get(root).toAbsolutePath().normalize()
        val excluded = excludedDirectoryNames.map { it.lowercase() }.toSet()
        Files.walkFileTree(rootPath, EnumSet.noneOf(FileVisitOption::class.java), Int.MAX_VALUE, WalkVisitor(rootPath, excluded, this))
    }.buffer(WALK_BUFFER).flowOn(Dispatchers.IO)

    override fun resolve(root: String, relativePath: String): String {
        val rootPath = Paths.get(root)
        if (relativePath.isEmpty()) return rootPath.toString()
        return rootPath.resolve(relativePath.replace('/', rootPath.fileSystem.separator[0])).toString()
    }

    override fun isInside(path: String, root: String): Boolean {
        val p = Paths.get(path).toAbsolutePath().normalize()
        val r = Paths.get(root).toAbsolutePath().normalize()
        return p.startsWith(r)
    }

    override suspend fun exists(path: String): Boolean = io { Files.exists(Paths.get(path)) }

    override suspend fun isDirectory(path: String): Boolean = io { Files.isDirectory(Paths.get(path)) }

    override suspend fun size(path: String): Long? = io {
        val p = Paths.get(path)
        if (Files.isRegularFile(p)) Files.size(p) else null
    }

    override suspend fun createDirectories(path: String) = io { Files.createDirectories(Paths.get(path)); Unit }

    override fun temporaryPathFor(destination: String): String = destination + TEMP_SUFFIX

    override suspend fun copyToTemporary(source: String, destination: String): String = io {
        val dest = Paths.get(destination)
        val temporary = Paths.get(temporaryPathFor(destination))
        Files.createDirectories(dest.parent)
        logger.debug { "Copying $source -> $temporary" }
        Files.copy(Paths.get(source), temporary, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES)
        temporary.toString()
    }

    override suspend fun moveIntoPlace(temporaryPath: String, destination: String) = io {
        Files.move(Paths.get(temporaryPath), Paths.get(destination), StandardCopyOption.ATOMIC_MOVE)
        Unit
    }

    override suspend fun deleteFile(path: String) = io { Files.deleteIfExists(Paths.get(path)); Unit }

    override suspend fun readHead(path: String, maxBytes: Int): ByteArray = io {
        Files.newInputStream(Paths.get(path)).use { input -> input.readNBytes(maxBytes) }
    }

    override suspend fun writeText(path: String, text: String) = io {
        val p = Paths.get(path)
        p.parent?.let { Files.createDirectories(it) }
        Files.writeString(p, text)
        Unit
    }

    private suspend fun <T> io(block: () -> T): T = withContext(Dispatchers.IO) { block() }

    /**
     * Pushes walk events into the producing channel, blocking the walking thread when the consumer falls behind.
     */
    private class WalkVisitor(
        private val root: Path,
        private val excludedNames: Set<String>,
        private val scope: ProducerScope<WalkEvent>,
    ) : SimpleFileVisitor<Path>() {
        override fun preVisitDirectory(dir: Path, attrs: BasicFileAttributes): FileVisitResult {
            val name = dir.fileName?.toString()?.lowercase()
            if (dir != root && name != null && name in excludedNames) return FileVisitResult.SKIP_SUBTREE
            return offer(WalkEvent.Directory(relative(dir)))
        }

        override fun visitFile(file: Path, attrs: BasicFileAttributes): FileVisitResult {
            if (!attrs.isRegularFile) return FileVisitResult.CONTINUE
            val event = WalkEvent.File(
                ScannedFile(
                    relativePath = relative(file),
                    name = file.fileName.toString(),
                    size = attrs.size(),
                    modifiedAt = attrs.lastModifiedTime().toMillis(),
                    createdAt = attrs.creationTime()?.toMillis()?.takeIf { it > 0 },
                ),
            )
            return offer(event)
        }

        override fun visitFileFailed(file: Path, exc: IOException): FileVisitResult =
            offer(WalkEvent.Skipped(relative(file), exc.javaClass.simpleName))

        override fun postVisitDirectory(dir: Path, exc: IOException?): FileVisitResult = FileVisitResult.CONTINUE

        private fun offer(event: WalkEvent): FileVisitResult {
            val result = scope.trySendBlocking(event)
            return if (result.isSuccess) FileVisitResult.CONTINUE else FileVisitResult.TERMINATE
        }

        private fun relative(path: Path): String =
            root.relativize(path).toString().replace(root.fileSystem.separator, "/")
    }

    private companion object {
        const val WALK_BUFFER = 4096
        const val TEMP_SUFFIX = ".inventory-tmp"
    }
}

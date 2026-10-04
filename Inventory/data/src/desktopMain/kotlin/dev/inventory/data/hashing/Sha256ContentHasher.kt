package dev.inventory.data.hashing

import dev.inventory.core.port.ContentHasher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.nio.channels.FileChannel
import java.nio.file.Paths
import java.nio.file.StandardOpenOption
import java.security.MessageDigest

/**
 * ContentHasher using SHA-256 for full hashes and SHA-256 over size plus three sampled windows for quick hashes.
 */
class Sha256ContentHasher(
    private val dispatcher: CoroutineDispatcher,
) : ContentHasher {
    override suspend fun quickHash(path: String, size: Long): String = withContext(dispatcher) {
        val digest = MessageDigest.getInstance(ALGORITHM)
        digest.update(ByteBuffer.allocate(Long.SIZE_BYTES).putLong(size).array())
        FileChannel.open(Paths.get(path), StandardOpenOption.READ).use { channel ->
            if (size <= WINDOW * 3) {
                readFully(channel, 0, size.toInt(), digest)
            } else {
                readFully(channel, 0, WINDOW, digest)
                readFully(channel, size / 2 - WINDOW / 2, WINDOW, digest)
                readFully(channel, size - WINDOW, WINDOW, digest)
            }
        }
        digest.digest().toHex()
    }

    override suspend fun fullHash(path: String): String = withContext(dispatcher) {
        val digest = MessageDigest.getInstance(ALGORITHM)
        FileChannel.open(Paths.get(path), StandardOpenOption.READ).use { channel ->
            val buffer = ByteBuffer.allocateDirect(FULL_BUFFER)
            while (channel.read(buffer) >= 0) {
                buffer.flip()
                digest.update(buffer)
                buffer.clear()
            }
        }
        digest.digest().toHex()
    }

    private fun readFully(channel: FileChannel, position: Long, length: Int, digest: MessageDigest) {
        val buffer = ByteBuffer.allocate(length)
        var pos = position
        while (buffer.hasRemaining()) {
            val read = channel.read(buffer, pos)
            if (read < 0) break
            pos += read
        }
        buffer.flip()
        digest.update(buffer)
    }

    private fun ByteArray.toHex(): String = joinToString("") { byte -> HEX[(byte.toInt() shr 4) and 0xF].toString() + HEX[byte.toInt() and 0xF] }

    private companion object {
        const val ALGORITHM = "SHA-256"
        const val WINDOW = 64 * 1024
        const val FULL_BUFFER = 1024 * 1024
        const val HEX = "0123456789abcdef"
    }
}

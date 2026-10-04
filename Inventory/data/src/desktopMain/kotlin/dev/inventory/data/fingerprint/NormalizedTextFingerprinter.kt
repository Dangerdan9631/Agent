package dev.inventory.data.fingerprint

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.ContentFingerprinter
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Paths
import java.security.MessageDigest

/**
 * Fingerprints text files by hashing their content with line endings normalized to LF and trailing whitespace removed.
 */
class NormalizedTextFingerprinter(
    private val dispatcher: CoroutineDispatcher,
    private val maxSize: Long = 32L * 1024 * 1024,
) : ContentFingerprinter {
    override val kind: FingerprintKind = FingerprintKind.NORMALIZED_TEXT

    override fun supports(file: FileEntry): Boolean =
        file.size in 1..maxSize && (file.kind == FileKind.SOURCE || file.extension in TEXT_DOCUMENTS)

    override suspend fun fingerprint(path: String): String? = withContext(dispatcher) {
        val p = Paths.get(path)
        Files.newInputStream(p).use { input ->
            val head = input.readNBytes(SNIFF)
            if (head.any { it == 0.toByte() }) return@withContext null
        }
        val digest = MessageDigest.getInstance("SHA-256")
        var anyContent = false
        Files.newBufferedReader(p, StandardCharsets.UTF_8).use { reader -> hashLines(reader, digest) { anyContent = true } }
        if (!anyContent) null else digest.digest().joinToString("") { b -> ((b.toInt() and 0xFF) + 0x100).toString(16).substring(1) }
    }

    private fun hashLines(reader: BufferedReader, digest: MessageDigest, onLine: () -> Unit) {
        // Trailing blank lines are dropped so a file that gained a final newline still matches.
        var pendingBlank = 0
        while (true) {
            val line = reader.readLine() ?: break
            val trimmed = line.trimEnd()
            if (trimmed.isEmpty()) {
                pendingBlank++
                continue
            }
            repeat(pendingBlank) { digest.update('\n'.code.toByte()) }
            pendingBlank = 0
            digest.update(trimmed.toByteArray(StandardCharsets.UTF_8))
            digest.update('\n'.code.toByte())
            onLine()
        }
    }

    private companion object {
        const val SNIFF = 8192
        val TEXT_DOCUMENTS = setOf("txt", "md", "csv", "tsv", "log", "tex", "rtf")
    }
}

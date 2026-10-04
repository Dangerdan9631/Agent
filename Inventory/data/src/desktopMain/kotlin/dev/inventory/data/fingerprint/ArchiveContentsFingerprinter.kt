package dev.inventory.data.fingerprint

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.ContentFingerprinter
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest
import java.util.zip.ZipFile

/**
 * Fingerprints zip-based archives by hashing their sorted (name, size, crc) entry list, ignoring Office metadata parts so metadata-only edits still match.
 */
class ArchiveContentsFingerprinter(
    private val dispatcher: CoroutineDispatcher,
) : ContentFingerprinter {
    override val kind: FingerprintKind = FingerprintKind.ARCHIVE_CONTENTS

    override fun supports(file: FileEntry): Boolean = file.size > 0 && file.extension in SUPPORTED

    override suspend fun fingerprint(path: String): String? = withContext(dispatcher) {
        val entries = try {
            ZipFile(File(path)).use { zip ->
                zip.entries().asSequence()
                    .filter { !it.isDirectory && !isIgnored(it.name) }
                    .map { "${it.name}|${it.size}|${it.crc}" }
                    .sorted()
                    .toList()
            }
        } catch (e: Exception) {
            null
        } ?: return@withContext null
        if (entries.isEmpty()) return@withContext null
        val digest = MessageDigest.getInstance("SHA-256")
        for (entry in entries) {
            digest.update(entry.toByteArray())
            digest.update('\n'.code.toByte())
        }
        digest.digest().joinToString("") { b -> ((b.toInt() and 0xFF) + 0x100).toString(16).substring(1) }
    }

    private fun isIgnored(name: String): Boolean =
        name.startsWith("docProps/") || name == "META-INF/MANIFEST.MF" || name.startsWith("META-INF/") && name.endsWith(".SF")

    private companion object {
        val SUPPORTED = setOf("zip", "jar", "war", "ear", "docx", "xlsx", "pptx", "odt", "ods", "odp", "epub", "apk", "nupkg", "vsix")
    }
}

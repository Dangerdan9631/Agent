package dev.inventory.data.support

import java.nio.file.Path
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Writes a zip archive from a name-to-bytes map for archive fingerprint tests.
 */
class ZipWriter {
    /**
     * Creates a zip at path whose entries are the given files.
     */
    fun write(path: Path, entries: Map<String, ByteArray>) {
        ZipOutputStream(path.toFile().outputStream()).use { zip ->
            for ((name, bytes) in entries.toSortedMap()) {
                zip.putNextEntry(ZipEntry(name))
                zip.write(bytes)
                zip.closeEntry()
            }
        }
    }
}

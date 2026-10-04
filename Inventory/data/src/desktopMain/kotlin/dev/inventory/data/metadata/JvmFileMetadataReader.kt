package dev.inventory.data.metadata

import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.ExifIFD0Directory
import com.drew.metadata.exif.ExifSubIFDDirectory
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.port.FileMetadata
import dev.inventory.core.port.FileMetadataReader
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import java.io.File
import java.util.TimeZone
import java.util.zip.ZipFile

/**
 * Reads EXIF data for images, tags for audio, and entry listings for zip archives using JVM libraries.
 */
class JvmFileMetadataReader(
    private val dispatcher: CoroutineDispatcher,
) : FileMetadataReader {
    override suspend fun read(path: String, kind: FileKind, extension: String): FileMetadata = withContext(dispatcher) {
        try {
            when {
                kind == FileKind.IMAGE || kind == FileKind.VIDEO -> readImage(path)
                kind == FileKind.AUDIO -> readAudio(path)
                extension in ZIP_LIKE -> readArchive(path)
                else -> FileMetadata.EMPTY
            }
        } catch (e: Exception) {
            FileMetadata.EMPTY
        }
    }

    private fun readImage(path: String): FileMetadata {
        val metadata = ImageMetadataReader.readMetadata(File(path))
        val fields = ArrayList<Pair<String, String>>()
        var captured: Long? = null
        metadata.getFirstDirectoryOfType(ExifSubIFDDirectory::class.java)?.let { sub ->
            sub.getDateOriginal(TimeZone.getDefault())?.let { captured = it.time }
            sub.getDescription(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL)?.let { fields += "Taken" to it }
            sub.getDescription(ExifSubIFDDirectory.TAG_EXIF_IMAGE_WIDTH)?.let { w ->
                sub.getDescription(ExifSubIFDDirectory.TAG_EXIF_IMAGE_HEIGHT)?.let { h -> fields += "Dimensions" to "$w x $h" }
            }
            sub.getDescription(ExifSubIFDDirectory.TAG_EXPOSURE_TIME)?.let { fields += "Exposure" to it }
            sub.getDescription(ExifSubIFDDirectory.TAG_FNUMBER)?.let { fields += "Aperture" to it }
            sub.getDescription(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT)?.let { fields += "ISO" to it }
            sub.getDescription(ExifSubIFDDirectory.TAG_LENS_MODEL)?.let { fields += "Lens" to it }
        }
        metadata.getFirstDirectoryOfType(ExifIFD0Directory::class.java)?.let { ifd0 ->
            val make = ifd0.getDescription(ExifIFD0Directory.TAG_MAKE)
            val model = ifd0.getDescription(ExifIFD0Directory.TAG_MODEL)
            if (make != null || model != null) fields += "Camera" to listOfNotNull(make, model).joinToString(" ")
            ifd0.getDescription(ExifIFD0Directory.TAG_SOFTWARE)?.let { fields += "Software" to it }
        }
        for (directory in metadata.directories) {
            if (directory.name.contains("JPEG") || directory.name.contains("PNG-IHDR") || directory.name.contains("GIF Header")) {
                for (tag in directory.tags) {
                    if (tag.tagName.contains("Width") || tag.tagName.contains("Height")) fields += tag.tagName to tag.description
                }
            }
        }
        return FileMetadata(fields, captured)
    }

    private fun readAudio(path: String): FileMetadata {
        val audio = AudioFileIO.read(File(path))
        val fields = ArrayList<Pair<String, String>>()
        audio.tag?.let { tag ->
            listOf(
                "Title" to FieldKey.TITLE, "Artist" to FieldKey.ARTIST, "Album" to FieldKey.ALBUM,
                "Album artist" to FieldKey.ALBUM_ARTIST, "Year" to FieldKey.YEAR, "Track" to FieldKey.TRACK, "Genre" to FieldKey.GENRE,
            ).forEach { (label, key) -> tag.getFirst(key)?.takeIf { it.isNotBlank() }?.let { fields += label to it } }
        }
        audio.audioHeader?.let { header ->
            fields += "Duration" to formatSeconds(header.trackLength)
            fields += "Bitrate" to header.bitRate + " kbps"
            fields += "Format" to header.format
            fields += "Sample rate" to header.sampleRate + " Hz"
        }
        return FileMetadata(fields, null)
    }

    private fun readArchive(path: String): FileMetadata {
        val fields = ArrayList<Pair<String, String>>()
        ZipFile(File(path)).use { zip ->
            val entries = zip.entries().asSequence().filter { !it.isDirectory }.toList()
            fields += "Entries" to entries.size.toString()
            fields += "Uncompressed size" to entries.sumOf { it.size.coerceAtLeast(0) }.toString()
            entries.take(MAX_LISTED).forEach { fields += it.name to it.size.toString() }
            if (entries.size > MAX_LISTED) fields += "..." to "${entries.size - MAX_LISTED} more"
        }
        return FileMetadata(fields, null)
    }

    private fun formatSeconds(total: Int): String = "%d:%02d".format(total / 60, total % 60)

    private companion object {
        const val MAX_LISTED = 200
        val ZIP_LIKE = setOf("zip", "jar", "war", "ear", "docx", "xlsx", "pptx", "odt", "ods", "odp", "epub", "apk", "nupkg", "vsix")
    }
}

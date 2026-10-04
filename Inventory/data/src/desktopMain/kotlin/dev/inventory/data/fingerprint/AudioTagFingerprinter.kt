package dev.inventory.data.fingerprint

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.ContentFingerprinter
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import java.io.File
import java.util.logging.Level
import java.util.logging.Logger

/**
 * Fingerprints audio files by a normalized artist|title|album|duration key read from their tags.
 */
class AudioTagFingerprinter(
    private val dispatcher: CoroutineDispatcher,
) : ContentFingerprinter {
    init {
        Logger.getLogger("org.jaudiotagger").level = Level.OFF
    }

    override val kind: FingerprintKind = FingerprintKind.AUDIO_TAGS

    override fun supports(file: FileEntry): Boolean = file.kind == FileKind.AUDIO && file.extension in SUPPORTED && file.size > 0

    override suspend fun fingerprint(path: String): String? = withContext(dispatcher) {
        val audio = try {
            AudioFileIO.read(File(path))
        } catch (e: Exception) {
            null
        } ?: return@withContext null
        val tag = audio.tag ?: return@withContext null
        val artist = tag.getFirst(FieldKey.ARTIST).normalized()
        val title = tag.getFirst(FieldKey.TITLE).normalized()
        val album = tag.getFirst(FieldKey.ALBUM).normalized()
        if (title.isEmpty() || (artist.isEmpty() && album.isEmpty())) return@withContext null
        // Duration is bucketed to 2 seconds so slightly different encoders still match.
        val duration = audio.audioHeader?.trackLength?.let { it / 2 } ?: -1
        "$artist|$title|$album|$duration"
    }

    private fun String?.normalized(): String = this?.trim()?.lowercase()?.replace(Regex("\\s+"), " ") ?: ""

    private companion object {
        val SUPPORTED = setOf("mp3", "flac", "m4a", "ogg", "wav", "aif", "aiff", "wma", "opus")
    }
}

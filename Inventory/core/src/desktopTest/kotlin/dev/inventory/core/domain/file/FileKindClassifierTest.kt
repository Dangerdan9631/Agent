package dev.inventory.core.domain.file

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Verifies extension-to-kind mapping, including the source-over-video overlap for "ts".
 */
class FileKindClassifierTest {
    private val classifier = FileKindClassifier()

    @Test
    fun classifiesKnownExtensions() {
        assertEquals(FileKind.DOCUMENT, classifier.classify("pdf"))
        assertEquals(FileKind.SOURCE, classifier.classify("kt"))
        assertEquals(FileKind.IMAGE, classifier.classify("JPG"))
        assertEquals(FileKind.VIDEO, classifier.classify("mp4"))
        assertEquals(FileKind.AUDIO, classifier.classify("flac"))
        assertEquals(FileKind.ARCHIVE, classifier.classify("zip"))
        assertEquals(FileKind.OTHER, classifier.classify("bin"))
    }

    @Test
    fun prefersSourceOverVideoForTs() {
        assertEquals(FileKind.SOURCE, classifier.classify("ts"))
    }
}

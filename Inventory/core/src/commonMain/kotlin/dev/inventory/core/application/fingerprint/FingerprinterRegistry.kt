package dev.inventory.core.application.fingerprint

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.port.ContentFingerprinter

/**
 * Chooses the first registered fingerprinter that supports a file.
 */
class FingerprinterRegistry(
    private val fingerprinters: List<ContentFingerprinter>,
) {
    /**
     * Returns the fingerprinter to use for the file, or null when none applies.
     */
    fun select(file: FileEntry): ContentFingerprinter? = fingerprinters.firstOrNull { it.supports(file) }

    /**
     * Returns the file kinds any registered fingerprinter might handle, used to limit the candidate query.
     */
    fun supportedKinds(): Set<FileKind> =
        setOf(FileKind.DOCUMENT, FileKind.SOURCE, FileKind.IMAGE, FileKind.AUDIO, FileKind.ARCHIVE, FileKind.OTHER)
}

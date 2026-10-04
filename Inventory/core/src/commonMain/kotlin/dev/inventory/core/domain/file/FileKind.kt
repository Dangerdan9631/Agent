package dev.inventory.core.domain.file

/**
 * Coarse content category of a file, derived from its extension, that selects fingerprinting and preview behavior.
 */
enum class FileKind {
    /**
     * Office documents, PDFs, plain text, and similar human-authored documents.
     */
    DOCUMENT,

    /**
     * Source code, scripts, and configuration files.
     */
    SOURCE,

    /**
     * Raster or vector images.
     */
    IMAGE,

    /**
     * Video containers.
     */
    VIDEO,

    /**
     * Audio files.
     */
    AUDIO,

    /**
     * Zip-like archives, including Office Open XML containers.
     */
    ARCHIVE,

    /**
     * Anything not matched by the other categories.
     */
    OTHER,
}

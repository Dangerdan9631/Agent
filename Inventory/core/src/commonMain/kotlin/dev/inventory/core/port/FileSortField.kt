package dev.inventory.core.port

/**
 * Columns a file listing can be ordered by.
 */
enum class FileSortField {
    /**
     * Volume then relative path.
     */
    PATH,

    /**
     * File name.
     */
    NAME,

    /**
     * Extension then name.
     */
    EXTENSION,

    /**
     * Size in bytes.
     */
    SIZE,

    /**
     * Last modified time.
     */
    MODIFIED,

    /**
     * Content kind then path.
     */
    KIND,
}

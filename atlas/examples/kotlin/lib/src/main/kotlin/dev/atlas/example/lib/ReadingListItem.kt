package dev.atlas.example.lib

/**
 * Represents one normalized book title and its stable URL-safe slug.
 *
 * @property title Normalized non-empty display title.
 * @property slug Stable lower-case hyphenated identifier.
 */
data class ReadingListItem(
    val title: String,
    val slug: String
)

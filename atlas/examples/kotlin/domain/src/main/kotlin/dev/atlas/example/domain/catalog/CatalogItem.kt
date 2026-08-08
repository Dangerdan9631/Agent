package dev.atlas.example.domain.catalog

/**
 * Defines the common identity and descriptive behavior of every catalog item.
 *
 * @property id Stable non-empty catalog identifier.
 * @property title Normalized human-readable title.
 * @property kind Concrete item specialization.
 */
abstract class CatalogItem(
    val id: CatalogItemId,
    val title: String,
    val kind: CatalogItemKind
) {
    /**
     * Describes the specialized catalog content.
     *
     * @return Concise user-facing item description.
     */
    abstract fun describe(): String
}

package dev.atlas.example.domain.catalog

/**
 * Represents a book entry authored by one catalog contributor.
 *
 * @property author Non-empty author display name.
 */
class BookCatalogItem(
    id: CatalogItemId,
    title: String,
    val author: String
) : CatalogItem(id, title, CatalogItemKind.BOOK) {
    /**
     * Describes the book and its author.
     *
     * @return Readable book description.
     */
    override fun describe(): String = "$title by $author"
}

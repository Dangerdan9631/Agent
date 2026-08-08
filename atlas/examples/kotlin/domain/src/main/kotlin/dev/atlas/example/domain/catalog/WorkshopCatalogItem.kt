package dev.atlas.example.domain.catalog

/**
 * Represents an instructor-led workshop in the catalog.
 *
 * @property facilitator Non-empty facilitator display name.
 */
class WorkshopCatalogItem(
    id: CatalogItemId,
    title: String,
    val facilitator: String
) : CatalogItem(id, title, CatalogItemKind.WORKSHOP) {
    /**
     * Describes the workshop and its facilitator.
     *
     * @return Readable workshop description.
     */
    override fun describe(): String = "$title, facilitated by $facilitator"
}

package dev.atlas.example.domain.catalog

/**
 * Creates concrete catalog item specializations from validated drafts.
 */
class CatalogItemFactory(
    private val titlePolicy: CatalogTitlePolicy
) {
    /**
     * Creates one specialized item from a catalog draft.
     *
     * @param draft Validated seed values supplied by an application boundary.
     * @return Concrete book or workshop catalog item.
     */
    fun create(draft: CatalogItemDraft): CatalogItem {
        val id = createCatalogItemId(draft.id)
        val title = titlePolicy.normalize(draft.title)
        return when (draft.kind) {
            CatalogItemKind.BOOK -> BookCatalogItem(id, title, draft.contributor)
            CatalogItemKind.WORKSHOP -> WorkshopCatalogItem(id, title, draft.contributor)
        }
    }
}

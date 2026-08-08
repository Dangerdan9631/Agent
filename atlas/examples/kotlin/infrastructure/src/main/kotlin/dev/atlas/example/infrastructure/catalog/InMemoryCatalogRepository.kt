package dev.atlas.example.infrastructure.catalog

import dev.atlas.example.application.catalog.CatalogRepository
import dev.atlas.example.domain.catalog.CatalogItem
import org.apache.commons.lang3.StringUtils

/**
 * Stores catalog items in memory while preserving deterministic query ordering.
 */
class InMemoryCatalogRepository : CatalogRepository {
    private val items = mutableMapOf<String, CatalogItem>()

    /**
     * Stores or replaces one item by identity.
     *
     * @param item Valid domain item.
     */
    override fun save(item: CatalogItem) {
        items[item.id] = item
    }

    /**
     * Lists stored items by normalized title and identifier.
     *
     * @return Immutable deterministic item view.
     */
    override fun list(): List<CatalogItem> {
        return items.values.sortedWith(
            compareBy<CatalogItem> { item -> StringUtils.lowerCase(item.title) }
                .thenBy { item -> item.id }
        )
    }
}

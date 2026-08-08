package dev.atlas.example.application.catalog

import dev.atlas.example.domain.catalog.CatalogItem

/**
 * Persists and retrieves catalog items for application use cases.
 */
interface CatalogRepository {
    /**
     * Stores one item by stable identity.
     *
     * @param item Domain item that replaces any item with the same identifier.
     */
    fun save(item: CatalogItem)

    /**
     * Lists all stored items in repository-defined deterministic order.
     *
     * @return Immutable item view.
     */
    fun list(): List<CatalogItem>
}

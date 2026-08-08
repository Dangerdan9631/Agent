package dev.atlas.example.application.catalog

import dev.atlas.example.domain.catalog.CatalogItem

/**
 * Provides bounded catalog queries to delivery-layer callers.
 */
class CatalogQueryService(
    private val repository: CatalogRepository
) {
    /**
     * Lists a bounded number of catalog items.
     *
     * @param limit Positive maximum result count.
     * @return Deterministically ordered item view.
     */
    fun list(limit: Int = DEFAULT_CATALOG_LIMIT): List<CatalogItem> {
        require(limit > 0) { "Catalog query limit must be positive." }
        return repository.list().take(limit)
    }
}

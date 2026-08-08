package dev.atlas.example.app

import dev.atlas.example.application.catalog.CatalogImportReport
import dev.atlas.example.application.catalog.CatalogQueryService
import dev.atlas.example.application.catalog.ImportCatalog
import dev.atlas.example.domain.catalog.CatalogItem

/**
 * Exposes the catalog use cases needed by the delivery workflow.
 */
class ApplicationCatalogService(
    private val importCatalog: ImportCatalog,
    private val catalogQueries: CatalogQueryService
) {
    /**
     * Imports the configured seed through the application use case.
     *
     * @return Immutable import report.
     */
    fun importCatalog(): CatalogImportReport = importCatalog.execute()

    /**
     * Lists the imported domain items through the application query service.
     *
     * @return Deterministically ordered catalog items.
     */
    fun listItems(): List<CatalogItem> = catalogQueries.list()
}

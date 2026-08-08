package dev.atlas.example.application.catalog

import dev.atlas.example.domain.catalog.CatalogItemFactory

/**
 * Imports validated seed data through domain construction and repository ports.
 */
class ImportCatalog(
    private val itemFactory: CatalogItemFactory,
    private val repository: CatalogRepository,
    private val seedReader: CatalogSeedReader,
    private val clock: CatalogClock
) {
    /**
     * Imports the current seed document as one application operation.
     *
     * @return Report containing the persisted items and operation timestamp.
     */
    fun execute(): CatalogImportReport {
        val items = seedReader.read().map(itemFactory::create)
        items.forEach(repository::save)
        return CatalogImportReport(clock.now(), items)
    }
}

package dev.atlas.example.app

import dev.atlas.example.application.catalog.CatalogQueryService
import dev.atlas.example.application.catalog.ImportCatalog
import dev.atlas.example.domain.catalog.CatalogItemFactory
import dev.atlas.example.domain.catalog.DefaultCatalogTitlePolicy
import dev.atlas.example.infrastructure.catalog.DEFAULT_CATALOG_SEED
import dev.atlas.example.infrastructure.catalog.FixedCatalogClock
import dev.atlas.example.infrastructure.catalog.InMemoryCatalogRepository
import dev.atlas.example.infrastructure.catalog.JsonCatalogSeedReader
import java.time.Instant

/**
 * Owns concrete dependency composition for the runnable catalog application.
 */
class CatalogApplication private constructor(
    private val demo: CatalogDemo
) {
    /**
     * Runs the composed catalog workflow.
     */
    fun run() {
        demo.run()
    }

    companion object {
        /**
         * Composes the deterministic example adapters and use cases.
         *
         * @return Ready-to-run catalog application.
         */
        fun createDefault(): CatalogApplication {
            val repository = InMemoryCatalogRepository()
            val itemFactory = CatalogItemFactory(DefaultCatalogTitlePolicy())
            val seedReader = JsonCatalogSeedReader(DEFAULT_CATALOG_SEED)
            val clock = FixedCatalogClock(Instant.parse("2026-07-30T00:00:00.000Z"))
            val importCatalog = ImportCatalog(itemFactory, repository, seedReader, clock)
            val queryService = CatalogQueryService(repository)
            val service = ApplicationCatalogService(importCatalog, queryService)
            return CatalogApplication(CatalogDemo(service, RuntimeOutputWriter()))
        }
    }
}

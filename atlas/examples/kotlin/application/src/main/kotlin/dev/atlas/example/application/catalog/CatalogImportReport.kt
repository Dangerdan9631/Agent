package dev.atlas.example.application.catalog

import dev.atlas.example.domain.catalog.CatalogItem
import java.time.Instant

/**
 * Reports the immutable result of one catalog import use case.
 *
 * @property importedAt Timestamp supplied by the application clock.
 * @property items Items created and persisted by this import.
 */
data class CatalogImportReport(
    val importedAt: Instant,
    val items: List<CatalogItem>
) {
    /**
     * Counts imported items without exposing a mutable collection.
     */
    val importedCount: Int
        get() = items.size
}

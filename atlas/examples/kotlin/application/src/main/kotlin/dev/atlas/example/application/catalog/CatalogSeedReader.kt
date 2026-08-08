package dev.atlas.example.application.catalog

import dev.atlas.example.domain.catalog.CatalogItemDraft

/**
 * Loads validated seed drafts from an external representation.
 */
interface CatalogSeedReader {
    /**
     * Reads all drafts available to the current import operation.
     *
     * @return Validated catalog drafts in document order.
     */
    fun read(): List<CatalogItemDraft>
}

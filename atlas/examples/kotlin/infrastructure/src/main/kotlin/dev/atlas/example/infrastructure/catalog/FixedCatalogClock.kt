package dev.atlas.example.infrastructure.catalog

import dev.atlas.example.application.catalog.CatalogClock
import java.time.Instant

/**
 * Supplies a deterministic timestamp for the reproducible example application.
 */
class FixedCatalogClock(
    private val timestamp: Instant
) : CatalogClock {
    /**
     * Reads the configured immutable timestamp.
     *
     * @return Configured timestamp.
     */
    override fun now(): Instant = timestamp
}

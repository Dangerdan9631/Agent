package dev.atlas.example.application.catalog

import java.time.Instant

/**
 * Supplies application time without coupling use cases to the host clock.
 */
interface CatalogClock {
    /**
     * Reads the current application timestamp.
     *
     * @return Timestamp safe for the caller to retain.
     */
    fun now(): Instant
}

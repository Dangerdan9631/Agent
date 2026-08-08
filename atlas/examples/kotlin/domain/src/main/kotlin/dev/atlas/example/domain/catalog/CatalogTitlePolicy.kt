package dev.atlas.example.domain.catalog

/**
 * Normalizes human-entered titles without exposing persistence or presentation concerns.
 */
interface CatalogTitlePolicy {
    /**
     * Produces a non-empty display title from an untrusted candidate.
     *
     * @param candidate Title text that may contain inconsistent spacing or casing.
     * @return Normalized title suitable for a catalog item.
     */
    fun normalize(candidate: String): String
}

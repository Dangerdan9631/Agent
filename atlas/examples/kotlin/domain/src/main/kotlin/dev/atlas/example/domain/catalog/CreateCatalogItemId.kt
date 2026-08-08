package dev.atlas.example.domain.catalog

/**
 * Converts an external identifier into the stable catalog identifier format.
 *
 * @param candidate Untrusted identifier text.
 * @return Lowercase dash-separated non-empty identifier.
 */
fun createCatalogItemId(candidate: String): CatalogItemId {
    val identifier = candidate.trim()
        .lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .trim('-')
    require(identifier.isNotEmpty()) { "Catalog item id must contain a letter or digit." }
    return identifier
}

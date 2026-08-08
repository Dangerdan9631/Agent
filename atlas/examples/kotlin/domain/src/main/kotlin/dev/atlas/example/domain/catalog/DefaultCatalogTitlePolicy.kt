package dev.atlas.example.domain.catalog

/**
 * Applies the catalog's default whitespace and leading-capital title policy.
 */
class DefaultCatalogTitlePolicy : CatalogTitlePolicy {
    /**
     * Normalizes one candidate while rejecting blank titles.
     *
     * @param candidate User-owned title text.
     * @return Collapsed, leading-capital title text.
     */
    override fun normalize(candidate: String): String {
        val collapsed = candidate.trim().replace(Regex("\\s+"), " ")
        require(collapsed.isNotEmpty()) { "Catalog item title must not be blank." }
        return collapsed.replaceFirstChar { character -> character.titlecase() }
    }
}

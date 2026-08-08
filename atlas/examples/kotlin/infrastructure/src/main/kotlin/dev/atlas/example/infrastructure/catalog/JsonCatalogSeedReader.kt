package dev.atlas.example.infrastructure.catalog

import com.fasterxml.jackson.databind.ObjectMapper
import dev.atlas.example.application.catalog.CatalogSeedReader
import dev.atlas.example.domain.catalog.CATALOG_SCHEMA_VERSION
import dev.atlas.example.domain.catalog.CatalogItemDraft
import dev.atlas.example.domain.catalog.CatalogItemKind
import org.apache.commons.lang3.StringUtils

/**
 * Validates and translates a JSON catalog seed document at the infrastructure boundary.
 */
class JsonCatalogSeedReader(
    private val document: String,
    private val objectMapper: ObjectMapper = ObjectMapper()
) : CatalogSeedReader {
    /**
     * Parses the document and normalizes boundary-owned text values.
     *
     * @return Validated catalog item drafts.
     */
    override fun read(): List<CatalogItemDraft> {
        val seed = objectMapper.readTree(document)
        require(seed.path("schemaVersion").asInt() == CATALOG_SCHEMA_VERSION) {
            "Catalog seed schema version is not supported."
        }
        return seed.path("items").map { item ->
            val id = StringUtils.trim(item.path("id").asText())
            val title = StringUtils.normalizeSpace(item.path("title").asText())
            val contributor = StringUtils.normalizeSpace(item.path("contributor").asText())
            require(id.isNotEmpty() && title.isNotEmpty() && contributor.isNotEmpty()) {
                "Catalog seed items require id, title, and contributor values."
            }
            CatalogItemDraft(
                id,
                title,
                CatalogItemKind.valueOf(item.path("kind").asText().uppercase()),
                contributor
            )
        }
    }
}

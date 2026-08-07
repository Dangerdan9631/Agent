package dev.atlas.example.library

import com.fasterxml.jackson.databind.ObjectMapper
import org.apache.commons.lang3.StringUtils

/**
 * Parses product documents and exposes normalized catalog products.
 */
class Catalog {
    private val objectMapper = ObjectMapper()
    /**
     * Represents the validated product information available to dependent artifacts.
     *
     * @property identifier Stable lowercase product identifier.
     * @property displayName Human-readable product name with normalized whitespace.
     */
    data class Product(
        val identifier: String,
        val displayName: String
    )

    /**
     * Parses one JSON product document.
     *
     * @param document JSON object containing non-empty `id` and `name` string fields.
     * @return A normalized product value.
     */
    fun parseProduct(document: String): Product {
        val product = objectMapper.readTree(document)
        val identifier = product.path("id").asText()
        val displayName = StringUtils.normalizeSpace(product.path("name").asText())

        require(identifier.isNotBlank()) { "Product id must not be blank." }
        require(displayName.isNotBlank()) { "Product name must not be blank." }

        return Product(identifier.lowercase(), displayName)
    }
}

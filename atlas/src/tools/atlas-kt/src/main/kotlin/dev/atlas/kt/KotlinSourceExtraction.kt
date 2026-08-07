package dev.atlas.kt

/**
 * Contains one deterministic source extraction result before JSON serialization.
 *
 * @property elements Owned declaration elements.
 * @property relationships Source-owned relationships.
 */
data class KotlinSourceExtraction(
    val elements: List<KotlinAtlasElement>,
    val relationships: List<KotlinAtlasRelationship>
)

package dev.atlas.kt

/**
 * Represents one source-owned Kotlin relationship in the portable Atlas model.
 *
 * @property id Stable relationship identity.
 * @property sourceElementId Owned source element identity.
 * @property kind Shared relationship category.
 * @property targetLabel Fully qualified unresolved target label.
 */
data class KotlinAtlasRelationship(
    val id: String,
    val sourceElementId: String,
    val kind: String,
    val targetLabel: String
)

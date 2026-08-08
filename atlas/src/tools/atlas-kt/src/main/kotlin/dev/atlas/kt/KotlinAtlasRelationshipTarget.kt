package dev.atlas.kt

/**
 * Identifies an owned, cross-module, or unresolved relationship target.
 *
 * @property moduleId Optional artifact identity for a cross-module target.
 * @property elementId Optional stable declaration identity.
 * @property label Optional unresolved or presentation label.
 */
data class KotlinAtlasRelationshipTarget(
    val moduleId: String? = null,
    val elementId: String? = null,
    val label: String? = null
)

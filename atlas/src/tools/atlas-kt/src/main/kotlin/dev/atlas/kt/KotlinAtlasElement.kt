package dev.atlas.kt

/**
 * Represents one Kotlin declaration in the portable Atlas module model.
 *
 * @property id Stable declaration identity scoped to the owning module.
 * @property name Readable declaration name.
 * @property kind Shared declaration category.
 * @property qualifiedName Fully qualified declaration identity.
 * @property parentId Optional owning namespace or source-unit identity.
 * @property sourcePath Optional module-relative normalized Kotlin source path.
 * @property signature Optional callable overload signature.
 * @property traits Shared declaration traits in deterministic order.
 */
data class KotlinAtlasElement(
    val id: String,
    val name: String,
    val kind: String,
    val qualifiedName: String,
    val parentId: String?,
    val sourcePath: String?,
    val signature: String?,
    val traits: List<String> = emptyList()
)

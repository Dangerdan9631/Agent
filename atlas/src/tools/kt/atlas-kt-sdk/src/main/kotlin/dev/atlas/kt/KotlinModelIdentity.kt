package dev.atlas.kt

import java.net.URLEncoder

/**
 * Creates deterministic artifact-scoped identities for Kotlin declarations and relationships.
 */
class KotlinModelIdentity(
    private val artifactId: String
) {
    /**
     * Creates one stable declaration identity.
     *
     * @param kind Neutral declaration kind.
     * @param qualifiedName Canonical Kotlin declaration name.
     * @param signature Optional overload discriminator.
     * @return Opaque deterministic declaration identity.
     */
    fun elementId(kind: String, qualifiedName: String, signature: String? = null): String {
        return listOf(this.artifactId, kind, qualifiedName, signature.orEmpty()).joinToString("|")
    }

    /**
     * Creates one stable semantic relationship identity.
     *
     * @param sourceElementId Owned relationship source.
     * @param kind Neutral relationship kind.
     * @param target Portable relationship target.
     * @return Opaque deterministic relationship identity.
     */
    fun relationshipId(
        sourceElementId: String,
        kind: String,
        target: KotlinAtlasRelationshipTarget
    ): String {
        val targetIdentity = listOf(
            target.moduleId.orEmpty(),
            target.elementId.orEmpty(),
            target.label.orEmpty()
        ).joinToString("\u0000")
        return "relationship:${this.encode(sourceElementId)}>${this.encode(targetIdentity)}:$kind"
    }

    /**
     * Creates a local target for one owned declaration.
     *
     * @param elementId Stable target declaration identity.
     * @return Portable owned-element target.
     */
    fun localTarget(elementId: String): KotlinAtlasRelationshipTarget {
        return KotlinAtlasRelationshipTarget(elementId = elementId)
    }

    /**
     * Creates a stable unresolved target label.
     *
     * @param label Fully qualified or imported target label.
     * @return Portable unresolved target.
     */
    fun unresolvedTarget(label: String): KotlinAtlasRelationshipTarget {
        return KotlinAtlasRelationshipTarget(label = label)
    }

    private fun encode(value: String): String = URLEncoder.encode(value, Charsets.UTF_8)
}

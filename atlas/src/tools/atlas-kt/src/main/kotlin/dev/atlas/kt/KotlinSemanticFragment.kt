package dev.atlas.kt

/**
 * Carries KSP-resolved declaration facts without coupling the portable model to KSP APIs.
 *
 * @property artifactId Artifact identity supplied to the KSP compilation.
 * @property elements Resolved declaration facts emitted for one compilation target.
 */
data class KotlinSemanticFragment(
    val artifactId: String,
    val elements: List<Element>
) {
    /**
     * Describes relationship facts for one resolved declaration.
     *
     * Nullable relationship lists distinguish older fragments from an authoritative empty result.
     */
    data class Element(
        val qualifiedName: String,
        val kind: String,
        val signature: String?,
        val traits: List<String>,
        val references: List<String>?,
        val inherits: List<String>?,
        val implements: List<String>?
    )
}

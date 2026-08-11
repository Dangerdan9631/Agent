package dev.atlas.kt

/**
 * Contains compiler-parsed Kotlin source facts before portable identity resolution.
 *
 * @property packageName Optional package declared by the source file.
 * @property imports Explicit and wildcard imports in source order.
 * @property declarations Top-level and type-owned declarations in source order.
 */
data class KotlinSourceSyntax(
    val packageName: String?,
    val imports: List<Import>,
    val declarations: List<Declaration>
) {
    /**
     * Describes one Kotlin import without retaining compiler objects.
     *
     * @property target Fully qualified import target without a wildcard suffix.
     * @property alias Optional source alias.
     * @property wildcard Whether the import targets every declaration in a namespace.
     */
    data class Import(
        val target: String,
        val alias: String?,
        val wildcard: Boolean
    )

    /**
     * Describes one owned Kotlin declaration and its safely observable type relationships.
     *
     * @property name Display declaration name.
     * @property kind Neutral declaration kind.
     * @property qualifiedName Canonical Kotlin qualified name.
     * @property parentQualifiedName Optional owning declaration name.
     * @property signature Optional callable overload discriminator.
     * @property traits Shared semantic traits.
     * @property referencedTypes Types named outside inheritance clauses.
     * @property superTypes Direct inheritance or implementation targets.
     * @property typeParameters Type-parameter names that must not become external references.
     */
    data class Declaration(
        val name: String,
        val kind: String,
        val qualifiedName: String,
        val parentQualifiedName: String?,
        val signature: String?,
        val traits: List<String>,
        val referencedTypes: List<String>,
        val superTypes: List<SuperType>,
        val typeParameters: Set<String>
    )

    /**
     * Describes a direct supertype and the relationship implied by Kotlin syntax.
     *
     * @property typeName Referenced Kotlin type name.
     * @property kind Inheritance or implementation relationship kind.
     */
    data class SuperType(
        val typeName: String,
        val kind: String
    )
}

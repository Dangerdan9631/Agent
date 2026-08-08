package dev.atlas.kt

/**
 * Overlays compiler-resolved KSP relationships onto source-derived portable model records.
 */
class KotlinSemanticModelMerger(
    private val artifactId: String
) {
    /**
     * Replaces source-lexical relationship facts only where a fragment is authoritative.
     *
     * @param source Portable source-derived model.
     * @param fragments Semantic target fragments for the same artifact.
     * @return One deterministic model that remains independent from KSP object types.
     */
    fun merge(
        source: KotlinSourceExtraction,
        fragments: List<KotlinSemanticFragment>
    ): KotlinSourceExtraction {
        fragments.forEach { fragment ->
            require(fragment.artifactId == this.artifactId) {
                "Atlas semantic fragment artifact '${fragment.artifactId}' does not match '${this.artifactId}'."
            }
        }
        if (fragments.isEmpty()) return source
        val identity = KotlinModelIdentity(this.artifactId)
        val elementsByQualifiedName = source.elements.groupBy { element -> element.qualifiedName }
        val replacements = mutableMapOf<Pair<String, String>, List<KotlinAtlasRelationship>>()
        val semanticTraits = mutableMapOf<String, MutableSet<String>>()
        fragments.flatMap { fragment -> fragment.elements }.forEach { semantic ->
            val sourceElement = this.match(semantic, elementsByQualifiedName) ?: return@forEach
            semanticTraits.getOrPut(sourceElement.id) { mutableSetOf() }.addAll(semantic.traits)
            listOf(
                "references" to semantic.references,
                "inherits" to semantic.inherits,
                "implements" to semantic.implements
            ).forEach { (kind, targets) ->
                if (targets != null) {
                    replacements[sourceElement.id to kind] = targets.filterNot { targetName ->
                        this.isPlatformType(targetName)
                    }.map { targetName ->
                        val target = elementsByQualifiedName[targetName]?.singleOrNull()?.let { targetElement ->
                            identity.localTarget(targetElement.id)
                        } ?: identity.unresolvedTarget(targetName)
                        KotlinAtlasRelationship(
                            identity.relationshipId(sourceElement.id, kind, target),
                            sourceElement.id,
                            kind,
                            target
                        )
                    }
                }
            }
        }
        val elements = source.elements.map { element ->
            val traits = semanticTraits[element.id].orEmpty()
            if (traits.isEmpty()) element else element.copy(traits = (element.traits + traits).distinct().sorted())
        }
        val retained = source.relationships.filterNot { relationship ->
            replacements.containsKey(relationship.sourceElementId to relationship.kind)
        }
        return KotlinSourceExtraction(
            elements,
            (retained + replacements.values.flatten()).distinctBy { relationship -> relationship.id }
                .sortedBy { relationship -> relationship.id }
        )
    }

    private fun match(
        semantic: KotlinSemanticFragment.Element,
        elementsByQualifiedName: Map<String, List<KotlinAtlasElement>>
    ): KotlinAtlasElement? {
        val candidates = elementsByQualifiedName[semantic.qualifiedName].orEmpty()
        if (candidates.size == 1) return candidates.single()
        return candidates.filter { element -> element.kind == semantic.kind }
            .let { matches ->
                semantic.signature?.let { signature -> matches.singleOrNull { element -> element.signature == signature } }
                    ?: matches.singleOrNull()
            }
    }

    private fun isPlatformType(qualifiedName: String): Boolean {
        return qualifiedName.startsWith("kotlin.") || qualifiedName in JAVA_PLATFORM_TYPES
    }

    private companion object {
        val JAVA_PLATFORM_TYPES = setOf(
            "java.lang.Boolean",
            "java.lang.Byte",
            "java.lang.Character",
            "java.lang.Double",
            "java.lang.Float",
            "java.lang.Integer",
            "java.lang.Long",
            "java.lang.Object",
            "java.lang.Short",
            "java.lang.String",
            "java.lang.Void"
        )
    }
}

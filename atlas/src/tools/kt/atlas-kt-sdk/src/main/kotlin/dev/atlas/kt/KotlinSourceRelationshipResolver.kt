package dev.atlas.kt

/**
 * Resolves compiler-parsed Kotlin imports and type uses into portable semantic relationships.
 */
class KotlinSourceRelationshipResolver(
    private val identity: KotlinModelIdentity
) {
    /**
     * Creates deterministic relationships for one source document.
     *
     * @param syntax Compiler-independent Kotlin source facts.
     * @param sourceUnitId Owned source-unit declaration identity.
     * @param elementsByDeclaration Owned declaration elements keyed by their source facts.
     * @return Unique import, reference, inheritance, and implementation relationships.
     */
    fun resolve(
        syntax: KotlinSourceSyntax,
        sourceUnitId: String,
        elementsByDeclaration: Map<KotlinSourceSyntax.Declaration, KotlinAtlasElement>
    ): List<KotlinAtlasRelationship> {
        val declarationsByQualifiedName = elementsByDeclaration.entries
            .groupBy({ entry -> entry.key.qualifiedName }, { entry -> entry.value })
        val declarationByQualifiedName = syntax.declarations.associateBy { declaration -> declaration.qualifiedName }
        val imports = ImportIndex(syntax.imports)
        val relationships = mutableListOf<KotlinAtlasRelationship>()
        syntax.imports.distinctBy { value -> Triple(value.target, value.alias, value.wildcard) }
            .sortedWith(compareBy({ value -> value.target }, { value -> value.alias.orEmpty() }))
            .forEach { sourceImport ->
                val target = this.identity.unresolvedTarget(sourceImport.target)
                relationships.add(this.relationship(sourceUnitId, "imports", target))
            }
        elementsByDeclaration.forEach { (declaration, sourceElement) ->
            val ignoredTypeNames = this.typeParameters(declaration, declarationByQualifiedName)
            declaration.superTypes.forEach { superType ->
                val resolved = this.resolveTarget(
                    superType.typeName,
                    declaration,
                    syntax.packageName,
                    imports,
                    declarationsByQualifiedName,
                    declarationByQualifiedName,
                    ignoredTypeNames
                ) ?: return@forEach
                val kind = this.superTypeRelationshipKind(declaration, superType, resolved.element)
                relationships.add(this.relationship(sourceElement.id, kind, resolved.target))
            }
            declaration.referencedTypes.forEach { typeName ->
                val resolved = this.resolveTarget(
                    typeName,
                    declaration,
                    syntax.packageName,
                    imports,
                    declarationsByQualifiedName,
                    declarationByQualifiedName,
                    ignoredTypeNames
                ) ?: return@forEach
                if (resolved.element?.id != sourceElement.id) {
                    relationships.add(this.relationship(sourceElement.id, "references", resolved.target))
                }
            }
        }
        return relationships.distinctBy { relationship -> relationship.id }
            .sortedBy { relationship -> relationship.id }
    }

    private fun resolveTarget(
        rawName: String,
        declaration: KotlinSourceSyntax.Declaration,
        packageName: String?,
        imports: ImportIndex,
        declarationsByQualifiedName: Map<String, List<KotlinAtlasElement>>,
        declarationByQualifiedName: Map<String, KotlinSourceSyntax.Declaration>,
        ignoredTypeNames: Set<String>
    ): ResolvedTarget? {
        val simpleName = rawName.substringBefore('.')
        if (simpleName in ignoredTypeNames || this.isBuiltin(rawName)) {
            return null
        }
        val candidates = this.localCandidates(
            rawName,
            declaration,
            packageName,
            imports,
            declarationByQualifiedName
        )
        val local = candidates.firstNotNullOfOrNull { candidate ->
            declarationsByQualifiedName[candidate]?.singleOrNull()
        } ?: if (!rawName.contains('.')) {
            declarationsByQualifiedName.values.flatten().filter { element -> element.name == rawName }
                .singleOrNull()
        } else {
            null
        }
        if (local != null) {
            return ResolvedTarget(this.identity.localTarget(local.id), local)
        }
        val label = imports.expand(rawName)
            ?: packageName?.let { currentPackage ->
                if (!rawName.contains('.') && rawName.firstOrNull()?.isUpperCase() == true) {
                    "$currentPackage.$rawName"
                } else {
                    rawName
                }
            }
            ?: rawName
        return if (this.isBuiltin(label)) null else ResolvedTarget(this.identity.unresolvedTarget(label), null)
    }

    private fun localCandidates(
        rawName: String,
        declaration: KotlinSourceSyntax.Declaration,
        packageName: String?,
        imports: ImportIndex,
        declarationByQualifiedName: Map<String, KotlinSourceSyntax.Declaration>
    ): List<String> {
        val candidates = mutableListOf<String>()
        var parent = declaration.parentQualifiedName
        while (parent != null) {
            candidates.add("$parent.$rawName")
            parent = declarationByQualifiedName[parent]?.parentQualifiedName
        }
        imports.expand(rawName)?.let { expanded -> candidates.add(expanded) }
        if (packageName != null) {
            candidates.add("$packageName.$rawName")
        }
        candidates.add(rawName)
        return candidates.distinct()
    }

    private fun typeParameters(
        declaration: KotlinSourceSyntax.Declaration,
        declarationByQualifiedName: Map<String, KotlinSourceSyntax.Declaration>
    ): Set<String> {
        val names = declaration.typeParameters.toMutableSet()
        var parent = declaration.parentQualifiedName
        while (parent != null) {
            val parentDeclaration = declarationByQualifiedName[parent] ?: break
            names.addAll(parentDeclaration.typeParameters)
            parent = parentDeclaration.parentQualifiedName
        }
        return names
    }

    private fun superTypeRelationshipKind(
        declaration: KotlinSourceSyntax.Declaration,
        superType: KotlinSourceSyntax.SuperType,
        targetElement: KotlinAtlasElement?
    ): String {
        return when {
            declaration.kind == "interface" -> "inherits"
            targetElement?.kind == "interface" -> "implements"
            targetElement != null -> "inherits"
            else -> superType.kind
        }
    }

    private fun relationship(
        sourceElementId: String,
        kind: String,
        target: KotlinAtlasRelationshipTarget
    ): KotlinAtlasRelationship {
        return KotlinAtlasRelationship(
            this.identity.relationshipId(sourceElementId, kind, target),
            sourceElementId,
            kind,
            target
        )
    }

    private fun isBuiltin(typeName: String): Boolean {
        val simpleName = typeName.substringAfterLast('.')
        return typeName.startsWith("kotlin.") || simpleName in KOTLIN_BUILTIN_TYPES
    }

    private class ImportIndex(imports: List<KotlinSourceSyntax.Import>) {
        private val explicit = imports.filterNot { sourceImport -> sourceImport.wildcard }
            .associateBy { sourceImport -> sourceImport.alias ?: sourceImport.target.substringAfterLast('.') }
        private val wildcardPackages = imports.filter { sourceImport -> sourceImport.wildcard }
            .map { sourceImport -> sourceImport.target }
            .distinct()
            .sorted()

        fun expand(name: String): String? {
            val firstSegment = name.substringBefore('.')
            val explicitImport = this.explicit[firstSegment]
            if (explicitImport != null) {
                return explicitImport.target + name.removePrefix(firstSegment)
            }
            if (name.contains('.') && name.substringBefore('.').firstOrNull()?.isLowerCase() == true) {
                return name
            }
            return this.wildcardPackages.singleOrNull()?.let { packageName -> "$packageName.$name" }
        }
    }

    private data class ResolvedTarget(
        val target: KotlinAtlasRelationshipTarget,
        val element: KotlinAtlasElement?
    )

    private companion object {
        val KOTLIN_BUILTIN_TYPES = setOf(
            "Any",
            "Boolean",
            "Byte",
            "Char",
            "Double",
            "Float",
            "Int",
            "Long",
            "Nothing",
            "Short",
            "String",
            "Unit",
            "Array",
            "List",
            "MutableList",
            "Set",
            "MutableSet",
            "Map",
            "MutableMap",
            "Pair",
            "Triple",
            "Sequence"
        )
    }
}

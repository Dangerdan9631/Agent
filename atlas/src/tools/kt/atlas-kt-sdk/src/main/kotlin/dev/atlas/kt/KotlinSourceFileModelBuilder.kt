package dev.atlas.kt

/**
 * Maps one compiler-parsed Kotlin source document into portable declarations and relationships.
 */
class KotlinSourceFileModelBuilder(
    private val artifactId: String,
    private val sourcePath: String,
    private val parser: KotlinCompilerSourceParser = KotlinCompilerSourceParser()
) {
    /**
     * Extracts top-level and type-owned declarations plus safely derivable relationships.
     *
     * @param sourceText Complete UTF-8 Kotlin source text.
     * @return Elements and relationships whose source belongs to this document.
     */
    fun build(sourceText: String): KotlinSourceExtraction {
        val syntax = this.parser.parse(this.sourcePath, sourceText)
        val identity = KotlinModelIdentity(this.artifactId)
        val namespace = syntax.packageName?.let { packageName ->
            KotlinAtlasElement(
                identity.elementId("namespace", packageName),
                packageName.substringAfterLast('.'),
                "namespace",
                packageName,
                null,
                null,
                null
            )
        }
        val sourceUnit = KotlinAtlasElement(
            identity.elementId("source-unit", this.sourcePath),
            this.sourcePath.substringAfterLast('/'),
            "source-unit",
            this.sourcePath,
            namespace?.id,
            this.sourcePath,
            null
        )
        val fileOwnedDeclarations = syntax.declarations.filter { declaration ->
            declaration.parentQualifiedName == null && declaration.kind in FILE_OWNED_DECLARATION_KINDS
        }.toSet()
        val provisionalElements = syntax.declarations.filterNot { declaration ->
            declaration in fileOwnedDeclarations
        }.associateWith { declaration ->
            KotlinAtlasElement(
                identity.elementId(declaration.kind, declaration.qualifiedName, declaration.signature),
                declaration.name,
                declaration.kind,
                declaration.qualifiedName,
                null,
                this.sourcePath,
                declaration.signature,
                declaration.traits
            )
        }
        val elementsByQualifiedName = provisionalElements.entries
            .groupBy({ entry -> entry.key.qualifiedName }, { entry -> entry.value })
        val elementsByDeclaration = syntax.declarations.associateWith { declaration ->
            if (declaration in fileOwnedDeclarations) {
                sourceUnit
            } else {
                provisionalElements.getValue(declaration)
            }
        }.mapValues { (declaration, element) ->
            val parentId = declaration.parentQualifiedName?.let { parentName ->
                elementsByQualifiedName[parentName]?.singleOrNull()?.id
            } ?: sourceUnit.id
            if (element == sourceUnit) element else element.copy(parentId = parentId)
        }
        val relationships = KotlinSourceRelationshipResolver(identity).resolve(
            syntax,
            sourceUnit.id,
            elementsByDeclaration
        )
        return KotlinSourceExtraction(
            listOfNotNull(namespace, sourceUnit) + provisionalElements.keys.map { declaration ->
                elementsByDeclaration.getValue(declaration)
            },
            relationships
        )
    }

    private companion object {
        val FILE_OWNED_DECLARATION_KINDS = setOf("function", "constant")
    }
}

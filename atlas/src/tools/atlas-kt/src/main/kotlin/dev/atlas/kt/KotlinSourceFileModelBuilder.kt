package dev.atlas.kt

/**
 * Maps one Kotlin source document into portable declarations and import relationships.
 */
class KotlinSourceFileModelBuilder(
    private val artifactId: String,
    private val sourcePath: String
) {
    /**
     * Extracts conservative top-level declarations and explicit imports from one source document.
     *
     * @param sourceText Complete UTF-8 Kotlin source text.
     * @return Elements and relationships whose source belongs to this document.
     */
    fun build(sourceText: String): KotlinSourceExtraction {
        val packageName = Regex("(?m)^\\s*package\\s+([A-Za-z_][\\w.]*)")
            .find(sourceText)?.groupValues?.get(1)
        val sourceName = this.sourcePath.removeSuffix(".kt").replace('/', '.')
        val sourceId = this.elementId("source-unit", sourceName, null)
        val namespaceId = packageName?.let { name -> this.elementId("namespace", name, null) }
        val elements = mutableListOf<KotlinAtlasElement>()
        if (packageName != null && namespaceId != null) {
            elements.add(
                this.element(
                    namespaceId,
                    packageName.substringAfterLast('.'),
                    "namespace",
                    packageName,
                    null,
                    null
                )
            )
        }
        elements.add(this.element(sourceId, this.sourcePath.substringAfterLast('/'), "source-unit", sourceName, namespaceId, null))
        this.declarationMatches(sourceText).forEach { match ->
            val keyword = match.groupValues[1]
            val name = match.groupValues[2]
            val kind = this.declarationKind(keyword)
            val signature = if (keyword == "fun") match.groupValues[3].trim().ifEmpty { null } else null
            val qualifiedName = listOfNotNull(packageName, name).joinToString(".")
            elements.add(this.element(this.elementId(kind, qualifiedName, signature), name, kind, qualifiedName, sourceId, signature))
        }
        return KotlinSourceExtraction(elements, this.importRelationships(sourceText, sourceId))
    }

    /**
     * Finds Kotlin import declarations that can safely be represented without compiler internals.
     *
     * @param sourceText Complete Kotlin source text.
     * @param sourceId Owned source-unit element that imports every returned target.
     * @return Stable import relationships.
     */
    private fun importRelationships(sourceText: String, sourceId: String): List<KotlinAtlasRelationship> {
        return Regex("(?m)^\\s*import\\s+([A-Za-z_][\\w.]*(?:\\.\\*)?)")
            .findAll(sourceText)
            .map { match -> match.groupValues[1].removeSuffix(".*") }
            .distinct()
            .sorted()
            .map { target ->
                KotlinAtlasRelationship(
                    "relationship:${this.escapeId(sourceId)}>${this.escapeId(target)}:imports",
                    sourceId,
                    "imports",
                    target
                )
            }.toList()
    }

    /**
     * Finds portable top-level Kotlin declaration forms.
     *
     * @param sourceText Complete Kotlin source text.
     * @return Ordered declaration syntax matches.
     */
    private fun declarationMatches(sourceText: String): Sequence<MatchResult> {
        val declaration = Regex(
            "(?m)^\\s*(?:public|private|protected|internal|open|abstract|sealed|data|enum|annotation|inline|suspend|operator|infix|tailrec|external|expect|actual|const|lateinit|override|\\s)*" +
                "(class|interface|object|enum\\s+class|annotation\\s+class|typealias|fun|val|var)\\s+([A-Za-z_]\\w*)\\s*(?:\\(([^)]*)\\))?"
        )
        return declaration.findAll(sourceText)
    }

    /**
     * Maps Kotlin declaration syntax into the portable declaration vocabulary.
     *
     * @param keyword Matched Kotlin declaration keyword.
     * @return Shared Atlas declaration category.
     */
    private fun declarationKind(keyword: String): String {
        return when (keyword) {
            "interface" -> "interface"
            "enum class" -> "enum"
            "annotation class" -> "annotation"
            "typealias" -> "type-alias"
            "fun" -> "function"
            "val" -> "property"
            "var" -> "field"
            else -> "class"
        }
    }

    /**
     * Creates a stable element identity from artifact, declaration kind, qualified name, and signature.
     *
     * @param kind Shared declaration category.
     * @param qualifiedName Canonical declaration name.
     * @param signature Optional callable signature.
     * @return Artifact-scoped portable element identity.
     */
    private fun elementId(kind: String, qualifiedName: String, signature: String?): String {
        return listOf(this.artifactId, kind, qualifiedName, signature.orEmpty()).joinToString("|")
    }

    /**
     * Creates one portable element record.
     *
     * @return Element associated with this source document.
     */
    private fun element(
        id: String,
        name: String,
        kind: String,
        qualifiedName: String,
        parentId: String?,
        signature: String?
    ): KotlinAtlasElement {
        return KotlinAtlasElement(id, name, kind, qualifiedName, parentId, this.sourcePath, signature)
    }

    /**
     * Encodes an arbitrary stable identifier component without introducing JSON-sensitive characters.
     *
     * @param value Identifier component to encode.
     * @return URL-safe identifier component.
     */
    private fun escapeId(value: String): String = java.net.URLEncoder.encode(value, Charsets.UTF_8)
}

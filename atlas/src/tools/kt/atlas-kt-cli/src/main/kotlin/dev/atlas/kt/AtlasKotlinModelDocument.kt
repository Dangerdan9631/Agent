package dev.atlas.kt

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/**
 * Serializes one complete Kotlin artifact model as deterministic portable YAML.
 */
class AtlasKotlinModelDocument(
    private val request: KotlinModelGenerationRequest,
    private val elements: List<KotlinAtlasElement>,
    private val relationships: List<KotlinAtlasRelationship>
) {
    /**
     * Writes the complete YAML model through a temporary sibling file.
     */
    fun write() {
        val outputFile = this.request.outputFile
        outputFile.parentFile.mkdirs()
        val temporaryFile = File(outputFile.parentFile, "${outputFile.name}.tmp-${ProcessHandle.current().pid()}")
        temporaryFile.writeText(this.render())
        Files.move(
            temporaryFile.toPath(),
            outputFile.toPath(),
            StandardCopyOption.REPLACE_EXISTING
        )
    }

    /**
     * Produces the formatted module-model YAML document.
     *
     * @return Deterministic UTF-8 YAML content with a trailing newline.
     */
    private fun render(): String {
        val document = StringBuilder()
        document.appendLine("schemaVersion: 2")
        document.appendLine("generator:")
        document.appendLine("  name: ${this.quote("atlas-kt")}")
        document.appendLine("  version: ${this.quote("1")}")
        document.appendLine("source:")
        document.appendLine("  language: ${this.quote("kotlin")}")
        document.appendLine("module:")
        document.appendLine("  id: ${this.quote(this.request.moduleId)}")
        document.appendLine("  name: ${this.quote(this.request.displayName)}")
        document.appendLine("  version: ${this.quote(this.request.version)}")
        this.request.variant?.let { value -> document.appendLine("  variant: ${this.quote(value)}") }
        document.appendLine("  category: ${this.quote(this.request.category)}")
        this.appendCollection(document, "elements", this.elements.map(this::elementYaml))
        this.appendCollection(document, "relationships", this.relationships.map(this::relationshipYaml))
        return document.toString()
    }

    /**
     * Serializes one declaration with only present optional fields.
     *
     * @param element Portable Kotlin declaration.
     * @return Indented YAML mapping text.
     */
    private fun elementYaml(element: KotlinAtlasElement): List<String> {
        val fields = mutableListOf(
            "id: ${this.quote(element.id)}",
            "kind: ${this.quote(element.kind)}",
            "name: ${this.quote(element.name)}",
            "qualifiedName: ${this.quote(element.qualifiedName)}",
            "visibility: ${this.quote("unknown")}"
        )
        element.parentId?.let { value -> fields.add("parentId: ${this.quote(value)}") }
        if (element.traits.isNotEmpty()) {
            fields.add("traits:")
            fields.addAll(element.traits.distinct().sorted().map { trait -> "  - ${this.quote(trait)}" })
        }
        if (element.kind in setOf("function", "local-function", "constructor", "method")) {
            fields.add("signature:")
            fields.add("  typeParameters: []")
            fields.add("  parameters: []")
            if (element.kind != "constructor") fields.add("  returns:")
            if (element.kind != "constructor") fields.add("    kind: ${this.quote("unknown")}")
        }
        return fields
    }

    /**
     * Serializes one import or semantic relationship with an owned or unresolved target.
     *
     * @param relationship Source-owned relationship.
     * @return Indented YAML mapping text.
     */
    private fun relationshipYaml(relationship: KotlinAtlasRelationship): List<String> {
        val fields = mutableListOf(
            "id: ${this.quote(relationship.id)}",
            "sourceElementId: ${this.quote(relationship.sourceElementId)}",
            "kind: ${this.quote(relationship.kind)}",
            "target:"
        )
        val target = relationship.target
        when {
            target.elementId != null -> {
                val elementId = requireNotNull(target.elementId)
                fields.add("  type: ${this.quote("element")}")
                target.moduleId?.let { value -> fields.add("  moduleId: ${this.quote(value)}") }
                fields.add("  elementId: ${this.quote(elementId)}")
            }
            target.moduleId != null -> {
                val moduleId = requireNotNull(target.moduleId)
                fields.add("  type: ${this.quote("module")}")
                fields.add("  moduleId: ${this.quote(moduleId)}")
            }
            else -> {
                val label = requireNotNull(target.label)
                fields.add("  type: ${this.quote("external")}")
                fields.add("  id: ${this.quote(label)}")
                fields.add("  name: ${this.quote(label)}")
            }
        }
        return fields
    }

    /**
     * Appends one YAML sequence of mappings with stable indentation.
     *
     * @param document Mutable YAML document.
     * @param name Mapping key for the sequence.
     * @param entries Mapping fields for each sequence entry.
     */
    private fun appendCollection(document: StringBuilder, name: String, entries: List<List<String>>) {
        if (entries.isEmpty()) {
            document.appendLine("$name: []")
            return
        }
        document.appendLine("$name:")
        entries.forEach { fields ->
            fields.forEachIndexed { index, field ->
                document.appendLine(if (index == 0) "  - $field" else "    $field")
            }
        }
    }

    /** Quotes one YAML scalar using the JSON-compatible double-quoted escape form. */
    private fun quote(value: String): String = buildString {
        append('"')
        value.forEach { character ->
            when (character) {
                '\\' -> append("\\\\")
                '"' -> append("\\\"")
                '\b' -> append("\\b")
                '\u000C' -> append("\\f")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                else -> if (character.code < 0x20) {
                    append("\\u")
                    append(character.code.toString(16).padStart(4, '0'))
                } else append(character)
            }
        }
        append('"')
    }
}

package dev.atlas.kt

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/**
 * Serializes one complete Kotlin artifact model as deterministic portable JSON.
 */
class AtlasKotlinModelDocument(
    private val request: KotlinModelGenerationRequest,
    private val elements: List<KotlinAtlasElement>,
    private val relationships: List<KotlinAtlasRelationship>
) {
    /**
     * Writes the complete JSON model through a temporary sibling file.
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
     * Produces the formatted module-model JSON document.
     *
     * @return Deterministic UTF-8 JSON content with a trailing newline.
     */
    private fun render(): String {
        val elementJson = this.elements.joinToString(",\n") { element -> this.elementJson(element) }
        val relationshipJson = this.relationships.joinToString(",\n") { relationship -> this.relationshipJson(relationship) }
        return """{
  "schemaVersion": 1,
  "generatorVersion": "atlas-kt-1",
  "module": {
    "id": "${this.escape(this.request.moduleId)}",
    "displayName": "${this.escape(this.request.displayName)}",
    "version": "${this.escape(this.request.version)}",
    "category": "${this.escape(this.request.category)}"
  },
  "sourceLanguage": "kotlin",
  "elements": [
$elementJson
  ],
  "relationships": [
$relationshipJson
  ]
}
"""
    }

    /**
     * Serializes one declaration with only present optional fields.
     *
     * @param element Portable Kotlin declaration.
     * @return Indented JSON object text.
     */
    private fun elementJson(element: KotlinAtlasElement): String {
        val optional = listOfNotNull(
            element.signature?.let { value -> "\"signature\": \"${this.escape(value)}\"" },
            element.parentId?.let { value -> "\"parentId\": \"${this.escape(value)}\"" }
        ).joinToString(",\n      ", prefix = if (element.signature == null && element.parentId == null) "" else ",\n      ")
        return """    {
      "id": "${this.escape(element.id)}",
      "name": "${this.escape(element.name)}",
      "kind": "${this.escape(element.kind)}",
      "qualifiedName": "${this.escape(element.qualifiedName)}",
      "sourcePath": "${this.escape(element.sourcePath)}"$optional
    }"""
    }

    /**
     * Serializes one import or semantic relationship with a portable unresolved target label.
     *
     * @param relationship Source-owned relationship.
     * @return Indented JSON object text.
     */
    private fun relationshipJson(relationship: KotlinAtlasRelationship): String {
        return """    {
      "id": "${this.escape(relationship.id)}",
      "sourceElementId": "${this.escape(relationship.sourceElementId)}",
      "kind": "${this.escape(relationship.kind)}",
      "target": {
        "label": "${this.escape(relationship.targetLabel)}"
      }
    }"""
    }

    /**
     * Escapes a string for JSON string-literal use.
     *
     * @param value Raw text value.
     * @return JSON-safe text without surrounding quotes.
     */
    private fun escape(value: String): String {
        return value.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
    }
}

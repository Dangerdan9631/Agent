package dev.atlas.ksp

/**
 * Serializes KSP target fragments for aggregation by the Atlas Gradle plugin.
 */
class AtlasKspFragmentDocument(
    private val artifactId: String,
    private val elements: List<AtlasKspElement>
) {
    /** Returns a deterministic JSON source-fragment document. */
    fun render(): String {
        val values = elements.joinToString(",\n") { element ->
            val fields = mutableListOf(
                "\"id\": \"${escape(element.id)}\"",
                "\"name\": \"${escape(element.name)}\"",
                "\"kind\": \"${escape(element.kind)}\"",
                "\"qualifiedName\": \"${escape(element.qualifiedName)}\""
            )
            element.signature?.let { value -> fields.add("\"signature\": \"${escape(value)}\"") }
            fields.add("\"traits\": ${array(element.traits)}")
            element.references?.let { value -> fields.add("\"references\": ${array(value)}") }
            element.inherits?.let { value -> fields.add("\"inherits\": ${array(value)}") }
            element.implements?.let { value -> fields.add("\"implements\": ${array(value)}") }
            fields.joinToString(", ", prefix = "    { ", postfix = " }")
        }
        return """{
  "artifactId": "${escape(artifactId)}",
  "elements": [
$values
  ]
}
"""
    }

    /** Serializes one deterministic JSON string array. */
    private fun array(values: List<String>): String {
        return values.distinct().sorted().joinToString(", ", prefix = "[", postfix = "]") { value ->
            "\"${escape(value)}\""
        }
    }

    /** Escapes one JSON string value. */
    private fun escape(value: String): String {
        return buildString {
            value.forEach { character ->
                when (character) {
                    '\\' -> append("\\\\")
                    '\"' -> append("\\\"")
                    '\b' -> append("\\b")
                    '\u000C' -> append("\\f")
                    '\n' -> append("\\n")
                    '\r' -> append("\\r")
                    '\t' -> append("\\t")
                    else -> if (character.code < 0x20) {
                        append("\\u")
                        append(character.code.toString(16).padStart(4, '0'))
                    } else {
                        append(character)
                    }
                }
            }
        }
    }
}

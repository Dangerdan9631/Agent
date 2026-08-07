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
            """    { "id": "${escape(element.id)}", "name": "${escape(element.name)}", "kind": "${element.kind}", "qualifiedName": "${escape(element.qualifiedName)}"${element.signature?.let { value -> ", \"signature\": \"${escape(value)}\"" }.orEmpty()} }"""
        }
        return """{
  "artifactId": "${escape(artifactId)}",
  "elements": [
$values
  ]
}
"""
    }

    /** Escapes one JSON string value. */
    private fun escape(value: String): String = value.replace("\\", "\\\\").replace("\"", "\\\"")
}

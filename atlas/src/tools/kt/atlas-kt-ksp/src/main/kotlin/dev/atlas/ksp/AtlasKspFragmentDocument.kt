package dev.atlas.ksp

/**
 * Serializes KSP target fragments as deterministic YAML for the Atlas Gradle plugin.
 */
class AtlasKspFragmentDocument(
    private val artifactId: String,
    private val elements: List<AtlasKspElement>
) {
    /** Returns a deterministic YAML source-fragment document. */
    fun render(): String {
        return buildString {
            appendLine("artifactId: ${scalar(artifactId)}")
            appendLine("elements:")
            elements.forEach { element ->
                appendLine("  - id: ${scalar(element.id)}")
                appendLine("    name: ${scalar(element.name)}")
                appendLine("    kind: ${scalar(element.kind)}")
                appendLine("    qualifiedName: ${scalar(element.qualifiedName)}")
                element.signature?.let { value -> appendLine("    signature: ${scalar(value)}") }
                appendLine("    traits: ${array(element.traits)}")
                element.references?.let { value -> appendLine("    references: ${array(value)}") }
                element.inherits?.let { value -> appendLine("    inherits: ${array(value)}") }
                element.implements?.let { value -> appendLine("    implements: ${array(value)}") }
            }
        }
    }

    /** Serializes one deterministic YAML flow sequence. */
    private fun array(values: List<String>): String {
        return values.distinct().sorted().joinToString(", ", prefix = "[", postfix = "]") { value -> scalar(value) }
    }

    /** Quotes one YAML scalar with JSON-compatible escaping. */
    private fun scalar(value: String): String {
        return buildString {
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
                    } else {
                        append(character)
                    }
                }
            }
            append('"')
        }
    }
}

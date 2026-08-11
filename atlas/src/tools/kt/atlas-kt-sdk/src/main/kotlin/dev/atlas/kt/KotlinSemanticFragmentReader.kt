package dev.atlas.kt

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import java.io.File

/**
 * Reads the small platform-neutral YAML contract emitted by Atlas KSP processors.
 */
class KotlinSemanticFragmentReader(
    private val objectMapper: ObjectMapper = ObjectMapper(YAMLFactory())
) {
    /**
     * Reads every configured fragment in stable path order.
     *
     * @param files KSP YAML fragment files supplied by a build integration.
     * @return Validated semantic fragments.
     */
    fun read(files: List<File>): List<KotlinSemanticFragment> {
        return files.sortedBy { file -> file.path }.map { file ->
            require(file.isFile) { "Atlas semantic fragment does not exist: ${file.path}" }
            this.read(objectMapper.readTree(file), file.path)
        }
    }

    /** Maps one parsed YAML document to the immutable SDK fragment contract. */
    private fun read(document: JsonNode, description: String): KotlinSemanticFragment {
        val artifactId = document.path("artifactId").textValue()
            ?: throw IllegalArgumentException("Atlas semantic fragment '$description' is missing artifactId.")
        val elementsNode = document.path("elements")
        require(elementsNode.isArray) { "Atlas semantic fragment '$description' is missing elements." }
        val elements = elementsNode.map { value ->
            KotlinSemanticFragment.Element(
                requiredText(value, "qualifiedName", description),
                requiredText(value, "kind", description),
                value.path("signature").textValue(),
                stringArray(value, "traits").orEmpty().distinct().sorted(),
                stringArray(value, "references"),
                stringArray(value, "inherits"),
                stringArray(value, "implements")
            )
        }
        return KotlinSemanticFragment(artifactId, elements)
    }

    /** Returns one required textual element field. */
    private fun requiredText(element: JsonNode, name: String, description: String): String {
        return element.path(name).textValue()
            ?: throw IllegalArgumentException("Atlas semantic fragment '$description' has an element without $name.")
    }

    /** Returns a stable string array, or null when the field was not emitted. */
    private fun stringArray(element: JsonNode, name: String): List<String>? {
        val value = element.path(name)
        if (value.isMissingNode) return null
        require(value.isArray) { "Atlas semantic fragment field '$name' must be a sequence." }
        return value.map { entry -> entry.asText() }.distinct().sorted()
    }
}

package dev.atlas.kt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Verifies the standalone CLI boundary and deterministic neutral YAML output. */
class AtlasKotlinCliTest {
    @TempDir
    lateinit var temporaryDirectory: Path

    /** Ensures generated YAML parses, remains deterministic, and safely escapes metadata. */
    @Test
    fun writesDeterministicValidYaml() {
        val source = temporaryDirectory.resolve("src/main/kotlin/sample/Sample.kt")
        Files.createDirectories(source.parent)
        Files.writeString(source, "package sample\nclass Sample(val name: String)\n")
        val output = temporaryDirectory.resolve("build/sample.atlas.module.yml")
        val arguments = listOf(
            "generate",
            "--project-root", temporaryDirectory.toString(),
            "--module-id", "sample:module:1",
            "--display-name", "Sample \"module\"\nline",
            "--version", "1.0.0",
            "--category", "library",
            "--source-root", "src/main/kotlin",
            "--output", output.toString()
        )

        assertEquals(0, AtlasKotlinCli().run(arguments).exitCode)
        val first = Files.readString(output)
        assertEquals(0, AtlasKotlinCli().run(arguments).exitCode)
        assertEquals(first, Files.readString(output))
        val document = ObjectMapper(YAMLFactory()).readTree(first)
        assertEquals(2, document.path("schemaVersion").asInt())
        assertEquals("kotlin", document.path("source").path("language").asText())
        assertEquals("Sample \"module\"\nline", document.path("module").path("name").asText())
        assertTrue(document.path("elements").any { element -> element.path("kind").asText() == "class" })
        assertFalse(Files.list(output.parent).use { files ->
            files.anyMatch { file -> file.fileName.toString().contains(".tmp-") }
        })
    }

    /** Ensures KSP-resolved relationship facts replace lexical labels without leaking KSP types. */
    @Test
    fun consumesSemanticFragments() {
        val source = temporaryDirectory.resolve("src/main/kotlin/sample/Uses.kt")
        Files.createDirectories(source.parent)
        Files.writeString(source, "package sample\nclass Uses(val dependency: Dependency)\n")
        val fragment = temporaryDirectory.resolve("build/ksp/main/resources/atlas/jvm.atlas.fragment.yml")
        Files.createDirectories(fragment.parent)
        Files.writeString(
            fragment,
            """artifactId: "sample:module:1"
elements:
  - id: "semantic-uses"
    name: "Uses"
    kind: "class"
    qualifiedName: "sample.Uses"
    traits: ["resolved"]
    references: ["external.Dependency", "kotlin.String"]
    inherits: []
    implements: []
"""
        )
        val request = KotlinModelGenerationRequest(
            temporaryDirectory.toFile(),
            "sample:module:1",
            "sample",
            "1.0.0",
            "library",
            null,
            listOf("src/main/kotlin"),
            listOf(fragment.toFile()),
            temporaryDirectory.resolve("build/model.atlas.module.yml").toFile()
        )

        val model = KotlinSourceModelExtractor(request).extract()
        val uses = model.elements.single { element -> element.qualifiedName == "sample.Uses" }
        assertTrue("resolved" in uses.traits)
        assertTrue(model.relationships.any { relationship ->
            relationship.sourceElementId == uses.id && relationship.kind == "references" &&
                relationship.target.label == "external.Dependency"
        })
        assertFalse(model.relationships.any { relationship ->
            relationship.sourceElementId == uses.id && relationship.kind == "references" &&
                relationship.target.label == "sample.Dependency"
        })
        assertFalse(model.relationships.any { relationship -> relationship.target.label == "kotlin.String" })
    }
}

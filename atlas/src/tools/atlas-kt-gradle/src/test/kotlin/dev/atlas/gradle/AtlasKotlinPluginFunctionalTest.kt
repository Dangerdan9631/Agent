package dev.atlas.gradle

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.gradle.testkit.runner.GradleRunner
import org.junit.jupiter.api.Test
import java.nio.file.Files
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Exercises root aggregation through Gradle TestKit using a two-artifact Kotlin build.
 */
class AtlasKotlinPluginFunctionalTest {
    /** Verifies that root aggregation writes one manifest entry per source-owning child artifact. */
    @Test
    fun generatesModelsAndManifestForSubprojects() {
        val fixture = Files.createTempDirectory("atlas-kotlin-plugin")
        this.write(
            fixture,
            "settings.gradle.kts",
            """rootProject.name = "fixture"
include(":one", ":two")
"""
        )
        this.write(
            fixture,
            "build.gradle.kts",
            """plugins {
    kotlin("jvm") version "2.4.10" apply false
    id("dev.atlas.kotlin")
}

subprojects {
    group = "example"
    version = "1.2.3"
    apply(plugin = "org.jetbrains.kotlin.jvm")
}
"""
        )
        this.write(
            fixture,
            "one/src/main/kotlin/example/One.kt",
            """package example

interface Contract
open class Base
annotation class Marker
typealias Identifier = String
enum class State { READY }

object Registry {
    class Nested(val contract: Contract) : Base(), Contract {
        var state: State = State.READY
        fun load(id: Identifier): State = state
    }
}
"""
        )
        this.write(fixture, "two/src/main/kotlin/example/Two.kt", "package example\nfun two(value: String): String = value\n")
        this.write(
            fixture,
            "one/build/generated/ksp/main/resources/atlas/jvm.atlas-fragment.json",
            """{
  "artifactId": "example:one:1.2.3",
  "elements": [
    {
      "id": "semantic-registry",
      "name": "Registry",
      "kind": "class",
      "qualifiedName": "example.Registry",
      "traits": ["ksp-resolved"],
      "references": [],
      "inherits": [],
      "implements": []
    }
  ]
}
"""
        )
        GradleRunner.create()
            .withProjectDir(fixture.toFile())
            .withArguments("atlasGenerateManifest", "--stacktrace")
            .withPluginClasspath()
            .build()
        val manifest = Files.readString(fixture.resolve("build/atlas/models/atlas-workspace.json"))
        assertContains(manifest, "example:one:1.2.3")
        assertContains(manifest, "example:two:1.2.3")
        val firstModel = fixture.resolve("build/atlas/models/one/one.atlas-module.json")
        assertTrue(Files.exists(firstModel))
        assertTrue(Files.exists(fixture.resolve("build/atlas/models/two/two.atlas-module.json")))
        val modelText = Files.readString(firstModel)
        val model = ObjectMapper().readTree(modelText)
        val elements = model.path("elements").associateBy { element -> element.path("qualifiedName").asText() }
        val sourceUnit = elements.getValue("src/main/kotlin/example/One.kt")
        val registry = elements.getValue("example.Registry")
        val nested = elements.getValue("example.Registry.Nested")
        assertEquals("source-unit", sourceUnit.path("kind").asText())
        assertEquals("src/main/kotlin/example/One.kt", nested.path("sourcePath").asText())
        assertEquals(registry.path("id").asText(), nested.path("parentId").asText())
        assertEquals("type-alias", elements.getValue("example.Identifier").path("kind").asText())
        assertEquals("constant", elements.getValue("example.State.READY").path("kind").asText())
        assertTrue(registry.path("traits").map(JsonNode::asText).containsAll(listOf("singleton", "ksp-resolved")))
        assertTrue(model.path("relationships").any { relationship ->
            relationship.path("sourceElementId").asText() == nested.path("id").asText() &&
                relationship.path("kind").asText() == "inherits" &&
                relationship.path("target").path("elementId").asText() == elements.getValue("example.Base").path("id").asText()
        })
        assertTrue(model.path("relationships").any { relationship ->
            relationship.path("sourceElementId").asText() == nested.path("id").asText() &&
                relationship.path("kind").asText() == "implements" &&
                relationship.path("target").path("elementId").asText() == elements.getValue("example.Contract").path("id").asText()
        })
        assertFalse(modelText.contains(fixture.toString().replace('\\', '/')))
    }

    /** Writes one UTF-8 fixture file and its missing parent directories. */
    private fun write(root: java.nio.file.Path, path: String, contents: String) {
        val target = root.resolve(path)
        Files.createDirectories(target.parent)
        Files.writeString(target, contents)
    }
}

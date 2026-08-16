package dev.atlas.gradle

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import org.gradle.testkit.runner.GradleRunner
import org.junit.jupiter.api.Test
import java.nio.file.Files
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Exercises explicit single-target generation through Gradle TestKit.
 */
class AtlasKotlinPluginFunctionalTest {
    /** Verifies that one registered target writes one version-two model and no workspace manifest. */
    @Test
    fun generatesExplicitTargetModel() {
        val fixture = Files.createTempDirectory("atlas-kotlin-plugin")
        this.write(fixture, "settings.gradle.kts", "rootProject.name = \"fixture\"\n")
        this.write(
            fixture,
            "build.gradle.kts",
            """plugins {
    kotlin("jvm") version "2.4.10"
    id("dev.atlas.kotlin")
}

repositories {
    mavenCentral()
}

group = "example"
version = "1.2.3"

atlas {
    rootDirectory.set(layout.projectDirectory.dir("architecture"))
    models {
        create("jvm") {
            target.set("jvm")
            compilation.set("main")
            semanticFragments.from(layout.buildDirectory.dir("generated/ksp/main"))
            generateOnBuild.set(false)
        }
    }
}
"""
        )
        this.write(
            fixture,
            "src/main/kotlin/example/One.kt",
            """package example

interface Contract
open class Base
class One : Base(), Contract
"""
        )
        GradleRunner.create()
            .withProjectDir(fixture.toFile())
            .withArguments("atlasGenerateJvmModel", "--stacktrace")
            .withPluginClasspath()
            .build()

        val modelPath = fixture.resolve("architecture/model/fixture-jvm.atlas.module.yml")
        assertTrue(Files.exists(modelPath))
        assertFalse(Files.exists(fixture.resolve("architecture/model/atlas.manifest.yml")))
        val modelText = Files.readString(modelPath)
        val model = ObjectMapper(YAMLFactory()).readTree(modelText)
        assertEquals(2, model.path("schemaVersion").asInt())
        assertEquals("example:fixture:1.2.3:jvm", model.path("module").path("id").asText())
        assertEquals("jvm", model.path("module").path("variant").asText())
        assertTrue(model.path("elements").any { element -> element.path("qualifiedName").asText() == "example.One" })
        assertFalse(modelText.contains(fixture.toString().replace('\\', '/')))
    }

    /** Writes one UTF-8 fixture file and its missing parent directories. */
    private fun write(root: java.nio.file.Path, path: String, contents: String) {
        val target = root.resolve(path)
        Files.createDirectories(target.parent)
        Files.writeString(target, contents)
    }
}

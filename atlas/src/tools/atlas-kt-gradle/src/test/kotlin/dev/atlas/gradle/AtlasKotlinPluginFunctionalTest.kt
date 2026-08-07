package dev.atlas.gradle

import org.gradle.testkit.runner.GradleRunner
import org.junit.jupiter.api.Test
import java.nio.file.Files
import kotlin.test.assertContains
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
        this.write(fixture, "one/src/main/kotlin/example/One.kt", "package example\nclass One\n")
        this.write(fixture, "two/src/main/kotlin/example/Two.kt", "package example\nfun two(value: String): String = value\n")
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
        assertContains(
            Files.readString(firstModel),
            "\"sourcePath\": \"src/main/kotlin/example/One.kt\"\n    }"
        )
    }

    /** Writes one UTF-8 fixture file and its missing parent directories. */
    private fun write(root: java.nio.file.Path, path: String, contents: String) {
        val target = root.resolve(path)
        Files.createDirectories(target.parent)
        Files.writeString(target, contents)
    }
}

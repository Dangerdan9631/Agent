plugins {
    kotlin("jvm") version "2.4.10" apply false
    id("dev.atlas.kotlin")
}

group = "dev.atlas.example"
version = "1.0.0"

subprojects {
    group = rootProject.group
    version = rootProject.version

    apply(plugin = "org.jetbrains.kotlin.jvm")
}

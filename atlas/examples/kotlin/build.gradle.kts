plugins {
    kotlin("jvm") version "2.4.10" apply false
    id("com.google.devtools.ksp") version "2.3.9" apply false
    id("dev.atlas.kotlin")
}

group = "dev.atlas.example"
version = "1.0.0"

atlas {
    cliExecutable = file("../../node_modules/.bin/atlas-cli.cmd").absolutePath
    viewerExecutable = file("../../node_modules/.bin/atlas.cmd").absolutePath
    kspProcessorDependency = "dev.atlas:atlas-kt-ksp:0.1.0"
}

subprojects {
    group = rootProject.group
    version = rootProject.version

    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "com.google.devtools.ksp")
}

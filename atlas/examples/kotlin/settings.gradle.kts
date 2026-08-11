pluginManagement {
    includeBuild("../../src/tools/kt")
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

includeBuild("../../src/tools/kt")

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "atlas-kotlin-example"

include(":app")
include(":lib")

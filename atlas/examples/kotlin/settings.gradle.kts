pluginManagement {
    includeBuild("../../src/tools")
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "atlas-kotlin-example"

include(":library")
include(":app")

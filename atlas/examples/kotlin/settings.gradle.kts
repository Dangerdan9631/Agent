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

include(":domain")
include(":application")
include(":infrastructure")
include(":app")

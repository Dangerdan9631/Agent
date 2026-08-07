plugins {
    kotlin("jvm") version "2.4.10"
    `java-gradle-plugin`
}

group = "dev.atlas"
version = "0.1.0"

repositories {
    gradlePluginPortal()
    mavenCentral()
}

dependencies {
    implementation(project(":atlas-kt"))
    implementation(kotlin("stdlib"))
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.7.2")
    testImplementation(gradleTestKit())
}

gradlePlugin {
    plugins {
        create("atlasKotlin") {
            id = "dev.atlas.kotlin"
            implementationClass = "dev.atlas.gradle.AtlasKotlinPlugin"
            displayName = "Atlas Kotlin Architecture Models"
            description = "Generates federated Atlas module models from Kotlin JVM artifacts."
        }
    }
}

tasks.test {
    useJUnitPlatform()
}

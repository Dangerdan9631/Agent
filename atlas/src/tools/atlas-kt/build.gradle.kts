plugins {
    kotlin("jvm") version "2.4.10"
    application
}

group = "dev.atlas"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))
    testImplementation(kotlin("test"))
}

application {
    mainClass.set("dev.atlas.kt.AtlasKotlinCliMain")
}

tasks.test {
    useJUnitPlatform()
}

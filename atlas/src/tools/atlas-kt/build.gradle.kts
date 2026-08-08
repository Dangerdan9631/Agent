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
    implementation("org.jetbrains.kotlin:kotlin-compiler-embeddable:2.4.10")
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.12.2")
    testImplementation("com.fasterxml.jackson.core:jackson-databind:2.19.2")
}

application {
    mainClass.set("dev.atlas.kt.AtlasKotlinCliMain")
}

tasks.test {
    useJUnitPlatform()
}

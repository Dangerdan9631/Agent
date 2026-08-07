plugins {
    kotlin("jvm") version "2.2.21"
    `java-library`
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(24)
}

group = "dev.atlas"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.google.devtools.ksp:symbol-processing-api:2.2.21-2.0.5")
}

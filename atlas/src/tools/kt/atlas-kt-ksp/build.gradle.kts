plugins {
    kotlin("jvm") version "2.4.10"
    `java-library`
}

group = "dev.atlas"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.google.devtools.ksp:symbol-processing-api:2.3.9")
}

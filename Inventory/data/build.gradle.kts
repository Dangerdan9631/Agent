/**
 * JVM adapters for the core ports: SQLDelight persistence, NIO filesystem, hashing, and metadata readers.
 */
plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.sqldelight)
}

kotlin {
    jvm("desktop")

    sourceSets {
        commonMain.dependencies {
            api(project(":core"))
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.sqldelight.runtime)
        }
        val desktopMain by getting {
            dependencies {
                implementation(libs.sqldelight.sqlite.driver)
                implementation(libs.metadata.extractor)
                implementation(libs.jaudiotagger)
            }
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.kotlinx.coroutines.test)
        }
        val desktopTest by getting {
            dependencies {
                implementation(libs.junit.jupiter)
                implementation(libs.kotlinx.coroutines.test)
                runtimeOnly(libs.junit.platform.launcher)
                runtimeOnly(libs.logback.classic)
            }
        }
    }
}

sqldelight {
    databases {
        create("InventoryDatabase") {
            packageName.set("dev.inventory.data.db")
            dialect(libs.sqldelight.dialect.sqlite338)
            schemaOutputDirectory.set(file("src/commonMain/sqldelight/schema"))
            verifyMigrations.set(false)
        }
    }
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

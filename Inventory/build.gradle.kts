/**
 * Root build that declares the shared plugin versions for every Inventory module without applying them.
 */
plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.composeMultiplatform) apply false
    alias(libs.plugins.composeCompiler) apply false
    alias(libs.plugins.sqldelight) apply false
}

allprojects {
    group = "dev.inventory"
    version = "0.1.0"
}

tasks.register("test") {
    group = "verification"
    description = "Runs desktop tests in every module."
    dependsOn(subprojects.map { "${it.path}:allTests" })
}

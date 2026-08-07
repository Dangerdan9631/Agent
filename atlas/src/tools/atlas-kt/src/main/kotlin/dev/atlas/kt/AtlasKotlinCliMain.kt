package dev.atlas.kt

/**
 * Hosts the executable boundary for Kotlin source model generation.
 */
object AtlasKotlinCliMain {
    /**
     * Runs the requested Atlas Kotlin command and reports user-facing failures.
     *
     * @param arguments Command-line arguments after the executable name.
     */
    @JvmStatic
    fun main(arguments: Array<String>) {
        val result = AtlasKotlinCli().run(arguments.toList())
        if (result.message != null) {
            System.err.println(result.message)
        }
        if (result.exitCode != 0) {
            kotlin.system.exitProcess(result.exitCode)
        }
    }
}

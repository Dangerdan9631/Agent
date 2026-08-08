package dev.atlas.example.app

/**
 * Starts the executable Kotlin catalog through its concrete composition root.
 */
object ApplicationMain {
    /**
     * Runs the application demonstration.
     *
     * @param arguments Command-line arguments accepted by the runnable Gradle application.
     */
    @JvmStatic
    fun main(arguments: Array<String>) {
        CatalogApplication.createDefault().run()
    }
}

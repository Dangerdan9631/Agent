package dev.atlas.example.app

import com.google.common.collect.ImmutableList
import dev.atlas.example.library.Catalog
import org.apache.commons.lang3.StringUtils

/**
 * Composes the executable Kotlin example from catalog and presentation dependencies.
 */
object ApplicationMain {
    /**
     * Runs the application demonstration.
     *
     * @param arguments Command-line arguments accepted by the runnable Gradle application.
     */
    @JvmStatic
    fun main(arguments: Array<String>) {
        val product = ApplicationCatalogService(Catalog()).loadProduct()
        val labels = ImmutableList.of(product.identifier, product.displayName)

        println(StringUtils.join(labels, " | "))
    }
}

package dev.atlas.example.app

import dev.atlas.example.library.Catalog

/**
 * Coordinates application behavior through the library-owned catalog type.
 */
class ApplicationCatalogService(
    private val catalog: Catalog
) {
    /**
     * Loads one example product through the library dependency.
     *
     * @return Parsed product exposed by the library package.
     */
    fun loadProduct(): Catalog.Product {
        return catalog.parseProduct("""{"id":"atlas-guide","name":"Atlas architecture guide"}""")
    }
}

package dev.atlas.example.app

import com.google.common.collect.ImmutableList
import org.apache.commons.lang3.StringUtils
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Runs the catalog use cases and renders their results for a terminal user.
 */
class CatalogDemo(
    private val catalogService: ApplicationCatalogService,
    private val output: RuntimeOutputWriter
) {
    /**
     * Imports and presents the complete example catalog.
     */
    fun run() {
        val report = catalogService.importCatalog()
        val importedAt = DateTimeFormatter.ISO_LOCAL_DATE
            .withZone(ZoneOffset.UTC)
            .format(report.importedAt)
        val lines = ImmutableList.builder<String>()
            .add("Imported ${report.importedCount} catalog items on $importedAt.")
            .addAll(
                catalogService.listItems().map { item ->
                    "${StringUtils.capitalize(item.kind.name.lowercase())}: ${item.describe()}"
                }
            )
            .build()
        lines.forEach(output::writeLine)
    }
}

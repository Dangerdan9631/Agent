package dev.inventory.core.application.report

import dev.inventory.core.port.ConsolidationRepository
import dev.inventory.core.port.FileSystemPort
import io.github.oshai.kotlinlogging.KotlinLogging

/**
 * Writes a plan's action journal as a CSV file for auditing outside the application.
 */
class CsvReportWriter(
    private val plans: ConsolidationRepository,
    private val fileSystem: FileSystemPort,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Writes every action of the plan to outputPath and returns the number of rows written.
     */
    suspend fun write(planId: Long, outputPath: String): Int {
        val out = StringBuilder()
        out.append("action_id,kind,state,file_id,source_path,destination_path,depends_on,message,updated_at\n")
        var offset = 0
        var rows = 0
        while (true) {
            val page = plans.actions(planId, null, PAGE, offset)
            if (page.isEmpty()) break
            for (a in page) {
                out.append(a.id).append(',')
                    .append(a.kind.name).append(',')
                    .append(a.state.name).append(',')
                    .append(a.fileId).append(',')
                    .append(quote(a.sourcePath)).append(',')
                    .append(quote(a.destinationPath ?: "")).append(',')
                    .append(a.dependsOnActionId?.toString() ?: "").append(',')
                    .append(quote(a.message ?: "")).append(',')
                    .append(a.updatedAt).append('\n')
                rows++
            }
            offset += page.size
            if (page.size < PAGE) break
        }
        fileSystem.writeText(outputPath, out.toString())
        logger.info { "Wrote $rows report rows for plan $planId to $outputPath" }
        return rows
    }

    private fun quote(value: String): String = "\"" + value.replace("\"", "\"\"") + "\""

    private companion object {
        const val PAGE = 5000
    }
}

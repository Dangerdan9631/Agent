package dev.inventory.app.platform

import io.github.oshai.kotlinlogging.KotlinLogging
import java.awt.Desktop
import java.io.File

/**
 * PathOpener using java.awt.Desktop to reveal files in the system file manager.
 */
class DesktopPathOpener : PathOpener {
    private val logger = KotlinLogging.logger {}

    override fun revealInFileManager(path: String) {
        try {
            val file = File(path)
            val desktop = Desktop.getDesktop()
            if (desktop.isSupported(Desktop.Action.BROWSE_FILE_DIR) && file.exists()) {
                desktop.browseFileDirectory(file)
            } else {
                desktop.open(if (file.isDirectory) file else file.parentFile ?: file)
            }
        } catch (e: Exception) {
            logger.warn { "Could not reveal $path: ${e.message}" }
        }
    }
}

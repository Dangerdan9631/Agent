package dev.inventory.app.platform

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import javax.swing.JFileChooser
import javax.swing.SwingUtilities

/**
 * FolderPicker using Swing's JFileChooser, shown on the AWT event thread.
 */
class SwingFolderPicker : FolderPicker {
    override suspend fun pickFolder(title: String): String? = onEdt {
        val chooser = JFileChooser().apply {
            dialogTitle = title
            fileSelectionMode = JFileChooser.DIRECTORIES_ONLY
            isAcceptAllFileFilterUsed = false
        }
        if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION) chooser.selectedFile?.absolutePath else null
    }

    override suspend fun pickSaveFile(title: String, suggestedName: String): String? = onEdt {
        val chooser = JFileChooser().apply {
            dialogTitle = title
            fileSelectionMode = JFileChooser.FILES_ONLY
            selectedFile = File(suggestedName)
        }
        if (chooser.showSaveDialog(null) == JFileChooser.APPROVE_OPTION) chooser.selectedFile?.absolutePath else null
    }

    private suspend fun <T> onEdt(block: () -> T): T = withContext(Dispatchers.IO) {
        if (SwingUtilities.isEventDispatchThread()) {
            block()
        } else {
            var result: T? = null
            SwingUtilities.invokeAndWait { result = block() }
            @Suppress("UNCHECKED_CAST")
            result as T
        }
    }
}

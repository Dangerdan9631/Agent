package dev.inventory.app

import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.WindowPosition
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import dev.inventory.app.composition.CompositionRoot
import dev.inventory.app.presentation.shell.AppShell

/**
 * Desktop entry point.
 */
fun main() = application {
    val root = remember { CompositionRoot() }
    val deps = remember { root.build() }
    DisposableEffect(root) { onDispose { root.close() } }
    Window(
        onCloseRequest = ::exitApplication,
        title = "Inventory",
        state = rememberWindowState(position = WindowPosition.Aligned(androidx.compose.ui.Alignment.Center), size = DpSize(1400.dp, 900.dp)),
    ) {
        AppShell(deps)
    }
}

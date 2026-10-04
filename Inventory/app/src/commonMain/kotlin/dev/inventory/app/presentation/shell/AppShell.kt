package dev.inventory.app.presentation.shell

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DriveFileMove
import androidx.compose.material.icons.filled.Label
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.TableRows
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import dev.inventory.app.presentation.browser.BrowserScreen
import dev.inventory.app.presentation.common.TaskStatusBar
import dev.inventory.app.presentation.consolidate.ConsolidateScreen
import dev.inventory.app.presentation.duplicates.DuplicatesScreen
import dev.inventory.app.presentation.tags.TagsScreen
import dev.inventory.app.presentation.volumes.VolumesScreen

/**
 * Root composable: theme, navigation rail, the active screen, and the background task bar.
 */
@Composable
fun AppShell(deps: AppDependencies) {
    var destination by remember { mutableStateOf(Destination.VOLUMES) }
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()) {
        Surface(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(modifier = Modifier.weight(1f)) {
                    NavigationRail(modifier = Modifier.fillMaxHeight()) {
                        Destination.entries.forEach { d ->
                            NavigationRailItem(
                                selected = destination == d,
                                onClick = { destination = d },
                                icon = {
                                    Icon(
                                        when (d) {
                                            Destination.VOLUMES -> Icons.Filled.Storage
                                            Destination.BROWSER -> Icons.Filled.TableRows
                                            Destination.DUPLICATES -> Icons.Filled.ContentCopy
                                            Destination.TAGS -> Icons.Filled.Label
                                            Destination.CONSOLIDATE -> Icons.Filled.DriveFileMove
                                        },
                                        contentDescription = d.label,
                                    )
                                },
                                label = { Text(d.label) },
                            )
                        }
                    }
                    Box(modifier = Modifier.weight(1f).fillMaxHeight()) {
                        when (destination) {
                            Destination.VOLUMES -> VolumesScreen(deps.volumes, deps.folderPicker, deps.bytes, deps.timestamps)
                            Destination.BROWSER -> BrowserScreen(deps.browser, deps.imageDecoder, deps.pathOpener, deps.bytes, deps.timestamps)
                            Destination.DUPLICATES -> DuplicatesScreen(deps.duplicates, deps.imageDecoder, deps.pathOpener, deps.bytes, deps.timestamps)
                            Destination.TAGS -> TagsScreen(deps.tags)
                            Destination.CONSOLIDATE -> ConsolidateScreen(deps.consolidate, deps.folderPicker, deps.timestamps)
                        }
                    }
                }
                TaskStatusBar(deps.tasks)
            }
        }
    }
}

package dev.inventory.app.presentation.volumes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.inventory.app.platform.FolderPicker
import dev.inventory.app.platform.TimestampFormatter
import dev.inventory.app.presentation.common.ByteFormatter
import dev.inventory.core.domain.volume.Volume
import kotlinx.coroutines.launch

/**
 * Lists registered volumes with scan controls, history, and inventory figures.
 */
@Composable
fun VolumesScreen(
    viewModel: VolumesViewModel,
    folderPicker: FolderPicker,
    bytes: ByteFormatter,
    timestamps: TimestampFormatter,
) {
    val state by viewModel.state.collectAsState()
    val scope = rememberCoroutineScope()
    var pendingPath by remember { mutableStateOf<String?>(null) }
    var pendingLabel by remember { mutableStateOf("") }
    var renaming by remember { mutableStateOf<Volume?>(null) }
    var renameText by remember { mutableStateOf("") }
    var deleting by remember { mutableStateOf<Volume?>(null) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Volumes", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            OutlinedButton(onClick = { viewModel.scanAll() }, enabled = state.rows.isNotEmpty()) { Text("Rescan all") }
            Spacer(Modifier.width(8.dp))
            Button(onClick = {
                scope.launch {
                    folderPicker.pickFolder("Choose a drive or folder to inventory")?.let { path ->
                        pendingPath = path
                        pendingLabel = path.trimEnd('\\', '/').substringAfterLast('\\').substringAfterLast('/').ifBlank { path }
                    }
                }
            }) { Text("Add volume") }
        }
        state.message?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(16.dp))
        if (state.rows.isEmpty()) {
            Text("No volumes yet. Add a drive or folder to start building the inventory.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(state.rows, key = { it.volume.id }) { row ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(row.volume.label, style = MaterialTheme.typography.titleMedium)
                                Text(row.volume.rootPath, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            TextButton(onClick = { renaming = row.volume; renameText = row.volume.label }) { Text("Rename") }
                            TextButton(onClick = { deleting = row.volume }) { Text("Remove") }
                            Spacer(Modifier.width(8.dp))
                            Button(onClick = { viewModel.scan(row.volume) }) { Text(if (row.latestScan == null) "Scan" else "Rescan") }
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                            Stat("Files", row.presentFiles.toString())
                            Stat("Size", bytes.format(row.presentBytes))
                            Stat("Missing", row.missingFiles.toString())
                            Stat("Last scan", row.volume.lastScanAt?.let(timestamps::format) ?: "never")
                        }
                        if (row.history.isNotEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            Text("Scan history", style = MaterialTheme.typography.labelLarge)
                            row.history.forEach { scan ->
                                Text(
                                    "${timestamps.format(scan.startedAt)}  ${scan.status}  ${scan.fileCount} files, ${bytes.format(scan.byteCount)}, +${scan.newCount} new, ${scan.changedCount} changed, ${scan.missingCount} missing" +
                                        (scan.error?.let { "  ($it)" } ?: ""),
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    pendingPath?.let { path ->
        AlertDialog(
            onDismissRequest = { pendingPath = null },
            title = { Text("Add volume") },
            text = {
                Column {
                    Text(path, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = pendingLabel, onValueChange = { pendingLabel = it }, label = { Text("Label") }, singleLine = true)
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.addVolume(path, pendingLabel); pendingPath = null }) { Text("Add and scan") }
            },
            dismissButton = { TextButton(onClick = { pendingPath = null }) { Text("Cancel") } },
        )
    }
    renaming?.let { volume ->
        AlertDialog(
            onDismissRequest = { renaming = null },
            title = { Text("Rename volume") },
            text = { OutlinedTextField(value = renameText, onValueChange = { renameText = it }, label = { Text("Label") }, singleLine = true) },
            confirmButton = { Button(onClick = { viewModel.rename(volume, renameText); renaming = null }) { Text("Save") } },
            dismissButton = { TextButton(onClick = { renaming = null }) { Text("Cancel") } },
        )
    }
    deleting?.let { volume ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Remove volume?") },
            text = { Text("This removes '${volume.label}' and all of its inventory rows, tags, and decisions from the database. Files on disk are not touched.") },
            confirmButton = { Button(onClick = { viewModel.delete(volume); deleting = null }) { Text("Remove") } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}

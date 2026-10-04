package dev.inventory.app.presentation.common

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Bottom bar showing each background lane with a progress indicator and a cancel button.
 */
@Composable
fun TaskStatusBar(runner: BackgroundTaskRunner) {
    val statuses by runner.statuses.collectAsState()
    if (statuses.isEmpty()) return
    Surface(tonalElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            statuses.forEach { current ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(current.name, style = MaterialTheme.typography.labelLarge)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        current.error?.let { "${current.detail}: $it" } ?: current.detail,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (current.error != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                    )
                    if (current.running) {
                        TextButton(onClick = { runner.cancel(current.lane) }) { Text("Cancel") }
                    }
                }
                if (current.running) {
                    val fraction = current.fraction
                    if (fraction == null) {
                        LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                    } else {
                        LinearProgressIndicator(progress = { fraction }, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

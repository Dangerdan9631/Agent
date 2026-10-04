package dev.inventory.app.presentation.browser

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.width
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.inventory.app.presentation.common.DropdownField
import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.DuplicateStatusFilter
import dev.inventory.core.port.FileQuery
import kotlinx.coroutines.delay

/**
 * Filter controls for the file browser that edit a FileQuery.
 */
@Composable
fun BrowserFilterBar(
    query: FileQuery,
    volumes: List<Volume>,
    tags: List<Tag>,
    extensions: List<String>,
    onChange: (FileQuery) -> Unit,
) {
    var pathText by remember(query.pathContains) { mutableStateOf(query.pathContains ?: "") }
    var minText by remember(query.minSize) { mutableStateOf(query.minSize?.let { (it / 1024).toString() } ?: "") }
    var maxText by remember(query.maxSize) { mutableStateOf(query.maxSize?.let { (it / 1024).toString() } ?: "") }

    LaunchedEffect(pathText, minText, maxText) {
        delay(350)
        val min = minText.toLongOrNull()?.times(1024)
        val max = maxText.toLongOrNull()?.times(1024)
        val path = pathText.ifBlank { null }
        if (path != query.pathContains || min != query.minSize || max != query.maxSize) {
            onChange(query.copy(pathContains = path, minSize = min, maxSize = max))
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = pathText,
                onValueChange = { pathText = it },
                label = { Text("Path contains") },
                singleLine = true,
                modifier = Modifier.width(260.dp),
            )
            OutlinedTextField(value = minText, onValueChange = { minText = it }, label = { Text("Min KB") }, singleLine = true, modifier = Modifier.width(110.dp))
            OutlinedTextField(value = maxText, onValueChange = { maxText = it }, label = { Text("Max KB") }, singleLine = true, modifier = Modifier.width(110.dp))
            DropdownField(
                label = "Extension",
                options = listOf("") + extensions,
                selected = query.extension ?: "",
                render = { it.ifEmpty { "any" } },
                onSelect = { onChange(query.copy(extension = it.ifEmpty { null })) },
            )
            DropdownField(
                label = "Duplicates",
                options = DuplicateStatusFilter.entries,
                selected = query.duplicateStatus,
                render = { it.name.lowercase().replace('_', ' ') },
                onSelect = { onChange(query.copy(duplicateStatus = it)) },
            )
            DropdownField(
                label = "Presence",
                options = listOf(FilePresence.PRESENT, FilePresence.MISSING, null),
                selected = query.presence,
                render = { it?.name?.lowercase() ?: "any" },
                onSelect = { onChange(query.copy(presence = it)) },
            )
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            volumes.forEach { volume ->
                FilterChip(
                    selected = volume.id in query.volumeIds,
                    onClick = { onChange(query.copy(volumeIds = query.volumeIds.toggle(volume.id))) },
                    label = { Text(volume.label) },
                )
            }
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            FileKind.entries.forEach { kind ->
                FilterChip(
                    selected = kind in query.kinds,
                    onClick = { onChange(query.copy(kinds = query.kinds.toggle(kind))) },
                    label = { Text(kind.name.lowercase()) },
                )
            }
            Decision.entries.forEach { decision ->
                FilterChip(
                    selected = decision in query.decisions,
                    onClick = { onChange(query.copy(decisions = query.decisions.toggle(decision))) },
                    label = { Text("decision: ${decision.name.lowercase()}") },
                )
            }
        }
        if (tags.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                tags.forEach { tag ->
                    FilterChip(
                        selected = tag.id in query.tagIds,
                        onClick = { onChange(query.copy(tagIds = query.tagIds.toggle(tag.id))) },
                        label = { Text("#${tag.name}") },
                    )
                }
            }
        }
    }
}

private fun <T> Set<T>.toggle(value: T): Set<T> = if (value in this) this - value else this + value

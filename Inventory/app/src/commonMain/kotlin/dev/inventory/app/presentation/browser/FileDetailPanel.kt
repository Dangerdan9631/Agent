package dev.inventory.app.presentation.browser

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import dev.inventory.app.platform.ImageDecoder
import dev.inventory.app.platform.PathOpener
import dev.inventory.app.platform.TimestampFormatter
import dev.inventory.app.presentation.common.ByteFormatter
import dev.inventory.app.presentation.common.DropdownField
import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.domain.volume.Volume

/**
 * Right-hand panel with every copy's location, hashes, metadata, tags, decision, and a preview for one file.
 */
@Composable
fun FileDetailPanel(
    detail: FileDetail,
    volumes: List<Volume>,
    allTags: List<Tag>,
    imageDecoder: ImageDecoder,
    pathOpener: PathOpener,
    bytes: ByteFormatter,
    timestamps: TimestampFormatter,
    onClose: () -> Unit,
    onAttachTag: (Long) -> Unit,
    onDetachTag: (Long) -> Unit,
    onDecision: (Decision) -> Unit,
) {
    val volumeNames = volumes.associate { it.id to it.label }
    var image by remember(detail.file.id) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(detail.file.id) {
        image = if (detail.file.kind == FileKind.IMAGE) imageDecoder.decode(detail.absolutePath, 512) else null
    }

    Surface(tonalElevation = 1.dp, modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(detail.file.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose) { Text("Close") }
            }
            Text(detail.absolutePath, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedButton(onClick = { pathOpener.revealInFileManager(detail.absolutePath) }) { Text("Show in file manager") }

            image?.let {
                Image(bitmap = it, contentDescription = detail.file.name, modifier = Modifier.fillMaxWidth().heightIn(max = 320.dp))
            }

            Section("Attributes")
            Field("Volume", detail.volume?.label ?: "?")
            Field("Kind", detail.file.kind.name.lowercase())
            Field("Size", "${bytes.format(detail.file.size)} (${detail.file.size} bytes)")
            Field("Modified", timestamps.format(detail.file.modifiedAt))
            detail.file.createdAt?.let { Field("Created", timestamps.format(it)) }
            Field("Presence", detail.file.presence.name.lowercase())
            Field("Quick hash", detail.file.quickHash ?: "not computed")
            Field("Full hash", detail.file.fullHash ?: "not computed")
            detail.file.fingerprint?.let { Field("Fingerprint (${detail.file.fingerprintKind?.name?.lowercase()})", it) }

            Section("Decision")
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                DropdownField(
                    label = "Decision",
                    options = Decision.entries,
                    selected = detail.decision?.decision ?: Decision.UNDECIDED,
                    render = { it.name.lowercase() },
                    onSelect = onDecision,
                )
                detail.decision?.note?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            }

            Section("Tags")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                detail.tags.forEach { tag -> AssistChip(onClick = { onDetachTag(tag.id) }, label = { Text("#${tag.name}  x") }) }
                val remaining = allTags.filter { t -> detail.tags.none { it.id == t.id } }
                if (remaining.isNotEmpty()) {
                    DropdownField(label = "Add tag", options = remaining, selected = remaining.first(), render = { it.name }, onSelect = { onAttachTag(it.id) })
                }
            }

            Section("Copies (${detail.copies.size})")
            if (detail.copies.isEmpty()) Text("No other copies with matching content.", style = MaterialTheme.typography.bodySmall)
            detail.copies.forEach { copy ->
                Text("${volumeNames[copy.volumeId] ?: copy.volumeId}: ${copy.relativePath}  [${copy.presence.name.lowercase()}]", style = MaterialTheme.typography.bodySmall)
            }

            Section("Duplicate groups (${detail.groups.size})")
            detail.groups.forEach { group ->
                Text("${group.kind} ${group.reason} ${(group.confidence * 100).toInt()}%  ${group.reviewState.name.lowercase()}", style = MaterialTheme.typography.bodySmall)
            }

            if (detail.metadata.fields.isNotEmpty()) {
                Section("Metadata")
                detail.metadata.fields.forEach { (label, value) -> Field(label, value) }
            }

            detail.textPreview?.let { preview ->
                Section("Preview")
                Text(preview, style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace))
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun Section(title: String) {
    HorizontalDivider()
    Text(title, style = MaterialTheme.typography.labelLarge)
}

@Composable
private fun Field(label: String, value: String) {
    Row {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(0.35f))
        Text(value, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.65f))
    }
}

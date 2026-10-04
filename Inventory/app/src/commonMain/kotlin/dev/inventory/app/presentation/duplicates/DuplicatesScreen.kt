package dev.inventory.app.presentation.duplicates

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.inventory.app.platform.ImageDecoder
import dev.inventory.app.platform.PathOpener
import dev.inventory.app.platform.TimestampFormatter
import dev.inventory.app.presentation.common.ByteFormatter
import dev.inventory.app.presentation.common.DropdownField
import dev.inventory.core.application.keeper.KeeperPolicyKind
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind

/**
 * Duplicate review with Exact, Probable, and Folders tabs, a group list, and a side-by-side member detail pane.
 */
@Composable
fun DuplicatesScreen(
    viewModel: DuplicatesViewModel,
    imageDecoder: ImageDecoder,
    pathOpener: PathOpener,
    bytes: ByteFormatter,
    timestamps: TimestampFormatter,
) {
    val state by viewModel.state.collectAsState()
    val volumeNames = state.volumes.associate { it.id to it.label }
    var policy by remember { mutableStateOf(KeeperPolicyKind.SHORTEST_PATH) }

    Row(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Duplicates", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                Button(onClick = { viewModel.runAnalysis() }) { Text("Analyze") }
            }
            Spacer(Modifier.height(8.dp))
            TabRow(selectedTabIndex = DuplicateGroupKind.entries.indexOf(state.kind)) {
                DuplicateGroupKind.entries.forEach { kind ->
                    Tab(
                        selected = state.kind == kind,
                        onClick = { viewModel.selectKind(kind) },
                        text = { Text("${kind.name.lowercase().replaceFirstChar { it.uppercase() }} (${state.openCounts[kind] ?: 0} open)") },
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                (listOf<ReviewState?>(ReviewState.OPEN, ReviewState.RESOLVED, ReviewState.DISMISSED) + listOf(null)).forEach { rs ->
                    FilterChip(selected = state.reviewState == rs, onClick = { viewModel.selectReviewState(rs) }, label = { Text(rs?.name?.lowercase() ?: "all") })
                }
                Spacer(Modifier.weight(1f))
                DropdownField(label = "Policy", options = KeeperPolicyKind.entries, selected = policy, render = { it.name.lowercase().replace('_', ' ') }, onSelect = { policy = it })
                OutlinedButton(onClick = { viewModel.applyPolicy(policy, state.volumes.map { it.id }) }) { Text("Apply to all open") }
            }
            state.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary) }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${state.total} groups", modifier = Modifier.weight(1f))
                TextButton(onClick = { viewModel.previousPage() }, enabled = state.offset > 0) { Text("Previous") }
                TextButton(onClick = { viewModel.nextPage() }, enabled = state.offset + state.pageSize < state.total) { Text("Next") }
            }
            HorizontalDivider()
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(state.summaries, key = { it.group.id }) { summary ->
                    val selected = state.detail?.group?.id == summary.group.id
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .background(if (selected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface)
                            .clickable { viewModel.showGroup(summary.group.id) }
                            .padding(vertical = 6.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(summary.sampleName.ifEmpty { "(group ${summary.group.id})" }, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                "${summary.group.reason}  ${(summary.group.confidence * 100).toInt()}%  ${summary.memberCount} members  ${bytes.format(summary.totalBytes)}  ${summary.group.reviewState.name.lowercase()}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
        state.detail?.let { detail ->
            VerticalDivider()
            Column(modifier = Modifier.width(560.dp).fillMaxHeight().padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Group ${detail.group.id}: ${detail.group.reason} (${(detail.group.confidence * 100).toInt()}%)", style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(detail.group.reviewState.name.lowercase(), style = MaterialTheme.typography.labelLarge)
                    if (detail.group.reviewState == ReviewState.OPEN) {
                        OutlinedButton(onClick = { viewModel.dismiss(detail.group.id) }) { Text("Not duplicates") }
                    } else {
                        OutlinedButton(onClick = { viewModel.reopen(detail.group.id) }) { Text("Reopen") }
                    }
                }
                HorizontalDivider()
                if (detail.group.kind == DuplicateGroupKind.FOLDER) {
                    detail.directories.forEach { dir ->
                        val isKeeper = detail.group.keeperFileId == dir.id
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    (if (isKeeper) "KEEPER  " else "") + "${volumeNames[dir.volumeId] ?: dir.volumeId}: ${dir.relativePath.ifEmpty { "(root)" }}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (isKeeper) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                )
                                Text("${dir.fileCount} files, ${bytes.format(dir.byteCount)}", style = MaterialTheme.typography.bodySmall)
                                Row {
                                    TextButton(onClick = { pathOpener.revealInFileManager(detail.absolutePaths[dir.id] ?: dir.relativePath) }) { Text("Show") }
                                    if (!isKeeper) TextButton(onClick = { viewModel.chooseKeeper(detail.group.id, dir.id) }) { Text("Keep this folder") }
                                }
                            }
                        }
                    }
                    if (detail.contentTree.isNotEmpty()) {
                        Text("Contents", style = MaterialTheme.typography.titleSmall)
                        ContentTreeNodes(detail.contentTree, depth = 0, bytes = bytes)
                    }
                } else {
                    detail.files.forEach { file ->
                        MemberCard(
                            file = file,
                            volumeName = volumeNames[file.volumeId] ?: file.volumeId.toString(),
                            absolutePath = detail.absolutePaths[file.id] ?: file.relativePath,
                            isKeeper = detail.group.keeperFileId == file.id,
                            decision = detail.decisions[file.id]?.name?.lowercase(),
                            score = detail.members.firstOrNull { it.memberId == file.id }?.score ?: 0.0,
                            imageDecoder = imageDecoder,
                            bytes = bytes,
                            timestamps = timestamps,
                            onKeep = { viewModel.chooseKeeper(detail.group.id, file.id) },
                            onReveal = { pathOpener.revealInFileManager(detail.absolutePaths[file.id] ?: file.relativePath) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MemberCard(
    file: FileEntry,
    volumeName: String,
    absolutePath: String,
    isKeeper: Boolean,
    decision: String?,
    score: Double,
    imageDecoder: ImageDecoder,
    bytes: ByteFormatter,
    timestamps: TimestampFormatter,
    onKeep: () -> Unit,
    onReveal: () -> Unit,
) {
    var image by remember(file.id) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(file.id) {
        image = if (file.kind == FileKind.IMAGE) imageDecoder.decode(absolutePath, 200) else null
    }
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            image?.let {
                Image(bitmap = it, contentDescription = file.name, modifier = Modifier.width(96.dp).height(96.dp))
                Spacer(Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text((if (isKeeper) "KEEPER  " else "") + "$volumeName: ${file.relativePath}", style = MaterialTheme.typography.bodyMedium, color = if (isKeeper) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                Text("${bytes.format(file.size)}  modified ${timestamps.format(file.modifiedAt)}  score ${(score * 100).toInt()}%" + (decision?.let { "  [$it]" } ?: ""), style = MaterialTheme.typography.bodySmall)
                Text(file.fullHash ?: file.quickHash ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row {
                    TextButton(onClick = onReveal) { Text("Show") }
                    if (!isKeeper) TextButton(onClick = onKeep) { Text("Keep this one") }
                }
            }
        }
    }
}

@Composable
private fun ContentTreeNodes(nodes: List<ContentNode>, depth: Int, bytes: ByteFormatter) {
    nodes.forEach { node ->
        key(node.path) {
            val isFolder = node.children.isNotEmpty()
            if (!isFolder) {
                Text(
                    node.name + (node.file?.let { "  ${bytes.format(it.size)}" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(start = (depth * 16).dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            } else {
                var expanded by remember(node.path) { mutableStateOf(depth == 0) }
                Text(
                    (if (expanded) "▾ " else "▸ ") + node.name,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(start = (depth * 16).dp).clickable { expanded = !expanded },
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (expanded) ContentTreeNodes(node.children, depth + 1, bytes)
            }
        }
    }
}

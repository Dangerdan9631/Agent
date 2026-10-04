package dev.inventory.app.presentation.browser



import androidx.compose.foundation.background

import androidx.compose.foundation.clickable

import androidx.compose.foundation.layout.Arrangement

import androidx.compose.foundation.layout.Box

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

import androidx.compose.foundation.lazy.rememberLazyListState

import androidx.compose.material3.Checkbox

import androidx.compose.material3.HorizontalDivider

import androidx.compose.material3.MaterialTheme

import androidx.compose.material3.Text

import androidx.compose.material3.TextButton

import androidx.compose.material3.VerticalDivider

import androidx.compose.runtime.Composable

import androidx.compose.runtime.collectAsState

import androidx.compose.runtime.getValue

import androidx.compose.ui.Alignment

import androidx.compose.ui.Modifier

import androidx.compose.ui.text.style.TextOverflow

import androidx.compose.ui.unit.dp

import dev.inventory.app.platform.ImageDecoder

import dev.inventory.app.platform.PathOpener

import dev.inventory.app.platform.TimestampFormatter

import dev.inventory.app.presentation.common.ByteFormatter

import dev.inventory.app.presentation.common.DropdownField

import dev.inventory.core.domain.decision.Decision



private const val TreeIndentDp = 16



/**

 * File browser with filter bar, volume tree, bulk actions, and detail panel.

 */

@Composable

fun BrowserScreen(

    viewModel: BrowserViewModel,

    imageDecoder: ImageDecoder,

    pathOpener: PathOpener,

    bytes: ByteFormatter,

    timestamps: TimestampFormatter,

) {

    val state by viewModel.state.collectAsState()



    Row(modifier = Modifier.fillMaxSize()) {

        Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(16.dp)) {

            Text("Browser", style = MaterialTheme.typography.headlineSmall)

            Spacer(Modifier.height(8.dp))

            BrowserFilterBar(state.query, state.volumes, state.tags, state.extensions) { viewModel.updateQuery(it) }

            Spacer(Modifier.height(8.dp))



            Text(

                "${state.total} files, ${bytes.format(state.totalBytes)}" + if (state.loading) " (loading)" else "",

                style = MaterialTheme.typography.bodyMedium,

            )

            Spacer(Modifier.height(8.dp))



            if (state.selected.isNotEmpty()) {

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {

                    Text("${state.selected.size} selected", style = MaterialTheme.typography.labelLarge)

                    if (state.tags.isNotEmpty()) {

                        DropdownField(label = "Add tag", options = state.tags, selected = state.tags.first(), render = { it.name }, onSelect = { viewModel.attachTag(it.id) })

                        DropdownField(label = "Remove tag", options = state.tags, selected = state.tags.first(), render = { it.name }, onSelect = { viewModel.detachTag(it.id) })

                    }

                    DropdownField(label = "Set decision", options = Decision.entries, selected = Decision.UNDECIDED, render = { it.name.lowercase() }, onSelect = { viewModel.setDecision(it) })

                    TextButton(onClick = { viewModel.clearSelection() }) { Text("Clear") }

                }

            }

            Spacer(Modifier.height(8.dp))



            HorizontalDivider()

            val listState = rememberLazyListState()

            LazyColumn(state = listState, modifier = Modifier.weight(1f)) {

                items(state.treeRows, key = { row -> rowKey(row) }) { row ->

                    when (row) {

                        is BrowserTreeRow.VolumeRow -> VolumeTreeRow(row, state, viewModel)
                        is BrowserTreeRow.FolderRow -> FolderTreeRow(row, state, viewModel)
                        is BrowserTreeRow.FileRow -> FileTreeRow(row, state, viewModel, bytes, timestamps)

                    }

                }

            }

        }

        if (state.detail != null || state.detailLoading) {

            VerticalDivider()

            Box(modifier = Modifier.width(420.dp).fillMaxHeight()) {

                val detail = state.detail

                if (detail == null) {

                    Text("Loading...", modifier = Modifier.padding(16.dp))

                } else {

                    FileDetailPanel(

                        detail = detail,

                        volumes = state.volumes,

                        allTags = state.tags,

                        imageDecoder = imageDecoder,

                        pathOpener = pathOpener,

                        bytes = bytes,

                        timestamps = timestamps,

                        onClose = { viewModel.closeDetail() },

                        onAttachTag = { viewModel.attachTag(it, listOf(detail.file.id)) },

                        onDetachTag = { viewModel.detachTag(it, listOf(detail.file.id)) },

                        onDecision = { viewModel.setDecision(it, listOf(detail.file.id)) },

                    )

                }

            }

        }

    }

}



@Composable

private fun VolumeTreeRow(row: BrowserTreeRow.VolumeRow, state: BrowserViewModel.BrowserState, viewModel: BrowserViewModel) {

    val key = "v:${row.volume.id}"

    val expanded = key in state.expanded

    val loading = key in state.loadingChildren

    Row(

        modifier = Modifier.fillMaxWidth()

            .clickable { viewModel.toggleVolume(row.volume.id) }

            .padding(vertical = 4.dp, horizontal = 4.dp),

        verticalAlignment = Alignment.CenterVertically,

    ) {

        Text(

            disclosure(expanded, loading) + row.volume.label,

            style = MaterialTheme.typography.titleSmall,

            maxLines = 1,

            overflow = TextOverflow.Ellipsis,

        )

        Spacer(Modifier.width(8.dp))

        Text(

            row.volume.rootPath,

            style = MaterialTheme.typography.bodySmall,

            color = MaterialTheme.colorScheme.onSurfaceVariant,

            maxLines = 1,

            overflow = TextOverflow.Ellipsis,

            modifier = Modifier.weight(1f),

        )

    }

}



@Composable

private fun FolderTreeRow(row: BrowserTreeRow.FolderRow, state: BrowserViewModel.BrowserState, viewModel: BrowserViewModel) {

    val key = "d:${row.volumeId}:${row.node.relativePath}"

    val expanded = key in state.expanded

    val loading = key in state.loadingChildren

    Row(

        modifier = Modifier.fillMaxWidth()

            .clickable { viewModel.toggleFolder(row.volumeId, row.node.relativePath) }

            .padding(vertical = 2.dp, horizontal = 4.dp)

            .padding(start = (row.depth * TreeIndentDp).dp),

        verticalAlignment = Alignment.CenterVertically,

    ) {

        Text(

            disclosure(expanded, loading) + row.node.name,

            style = MaterialTheme.typography.bodyMedium,

            maxLines = 1,

            overflow = TextOverflow.Ellipsis,

        )

    }

}



@Composable

private fun FileTreeRow(

    row: BrowserTreeRow.FileRow,

    state: BrowserViewModel.BrowserState,

    viewModel: BrowserViewModel,

    bytes: ByteFormatter,

    timestamps: TimestampFormatter,

) {

    val file = row.file

    val selectedRow = state.detail?.file?.id == file.id

    Row(

        modifier = Modifier.fillMaxWidth()

            .background(if (selectedRow) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface)

            .clickable { viewModel.showDetail(file) }

            .padding(vertical = 2.dp, horizontal = 4.dp)

            .padding(start = (row.depth * TreeIndentDp).dp),

        verticalAlignment = Alignment.CenterVertically,

    ) {

        Box(Modifier.width(36.dp)) {

            Checkbox(checked = file.id in state.selected, onCheckedChange = { viewModel.toggleSelected(file.id) })

        }

        Text(file.name, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.35f), maxLines = 1, overflow = TextOverflow.Ellipsis)

        Text(file.kind.name.lowercase(), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.1f), maxLines = 1)

        Text(bytes.format(file.size), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.12f), maxLines = 1)

        Text(timestamps.format(file.modifiedAt), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.18f), maxLines = 1)

        val tagText = state.tagsByFile[file.id]?.joinToString(" ") { "#${it.name}" } ?: ""

        val decision = state.decisionsByFile[file.id]?.let { " [${it.name.lowercase()}]" } ?: ""

        Text(tagText + decision, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(0.25f), maxLines = 1, overflow = TextOverflow.Ellipsis)

    }

}



private fun disclosure(expanded: Boolean, loading: Boolean): String =

    when {

        loading -> "… "

        expanded -> "▾ "

        else -> "▸ "

    }



private fun rowKey(row: BrowserTreeRow): String =

    when (row) {

        is BrowserTreeRow.VolumeRow -> "v:${row.volume.id}"
        is BrowserTreeRow.FolderRow -> "d:${row.volumeId}:${row.node.relativePath}"
        is BrowserTreeRow.FileRow -> "f:${row.file.id}"

    }


package dev.inventory.app.presentation.consolidate

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.inventory.app.platform.FolderPicker
import dev.inventory.app.platform.TimestampFormatter
import dev.inventory.app.presentation.common.DropdownField
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.domain.consolidation.PlanStatus
import kotlinx.coroutines.launch

/**
 * Consolidation: plan form, plan list, action journal with filters, execute/retry/export controls.
 */
@Composable
fun ConsolidateScreen(
    viewModel: ConsolidateViewModel,
    folderPicker: FolderPicker,
    timestamps: TimestampFormatter,
) {
    val state by viewModel.state.collectAsState()
    val scope = rememberCoroutineScope()

    Row(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.width(420.dp).fillMaxHeight().padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Consolidate", style = MaterialTheme.typography.headlineSmall)
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("New plan", style = MaterialTheme.typography.titleSmall)
                    Text(state.form.destinationRoot.ifBlank { "No destination chosen" }, style = MaterialTheme.typography.bodySmall)
                    OutlinedButton(onClick = {
                        scope.launch { folderPicker.pickFolder("Choose the consolidated destination folder")?.let { viewModel.updateForm(state.form.copy(destinationRoot = it)) } }
                    }) { Text("Choose destination") }
                    DropdownField(label = "Layout", options = LayoutStrategyKind.entries, selected = state.form.layout, render = { it.name.lowercase().replace('_', ' ') }, onSelect = { viewModel.updateForm(state.form.copy(layout = it)) })
                    DropdownField(label = "Conflicts", options = ConflictPolicyKind.entries, selected = state.form.conflicts, render = { it.name.lowercase().replace('_', ' ') }, onSelect = { viewModel.updateForm(state.form.copy(conflicts = it)) })
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = state.form.removeRedundantExact, onCheckedChange = { viewModel.updateForm(state.form.copy(removeRedundantExact = it)) })
                        Text("Delete redundant exact copies after the keeper is verified", style = MaterialTheme.typography.bodySmall)
                    }
                    Text("Volumes (none selected = all)", style = MaterialTheme.typography.labelLarge)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        state.volumes.forEach { volume ->
                            FilterChip(
                                selected = volume.id in state.form.volumeIds,
                                onClick = {
                                    val ids = state.form.volumeIds
                                    viewModel.updateForm(state.form.copy(volumeIds = if (volume.id in ids) ids - volume.id else ids + volume.id))
                                },
                                label = { Text(volume.label) },
                            )
                        }
                    }
                    Button(onClick = { viewModel.createPlan() }, enabled = state.form.destinationRoot.isNotBlank()) { Text("Build plan (dry run)") }
                    Text(
                        "Moves are copy, verify SHA-256, rename into place, then delete the source. Nothing is deleted before a verified copy exists. Probable duplicates are only removed when you explicitly marked them DISCARD.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            state.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary) }
            Text("Plans", style = MaterialTheme.typography.titleSmall)
            state.plans.forEach { plan ->
                val selected = plan.id == state.selectedPlanId
                Column(
                    modifier = Modifier.fillMaxWidth()
                        .background(if (selected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface)
                        .clickable { viewModel.selectPlan(plan.id) }
                        .padding(8.dp),
                ) {
                    Text("Plan ${plan.id}  ${plan.status.name.lowercase()}", style = MaterialTheme.typography.bodyMedium)
                    Text(plan.destinationRoot, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${timestamps.format(plan.createdAt)}  ${plan.layoutStrategy.name.lowercase().replace('_', ' ')}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        VerticalDivider()
        Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(16.dp)) {
            val plan = state.selectedPlan
            if (plan == null) {
                Text("Select or build a plan to see its actions.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                return@Column
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Plan ${plan.id}: ${plan.status.name.lowercase()}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                if (plan.status == PlanStatus.DRAFT) TextButton(onClick = { viewModel.deletePlan(plan.id) }) { Text("Discard plan") }
                if ((state.counts[ActionState.FAILED] ?: 0L) > 0) OutlinedButton(onClick = { viewModel.retryFailed() }) { Text("Retry failed") }
                OutlinedButton(onClick = {
                    scope.launch { folderPicker.pickSaveFile("Export plan report", "inventory-plan-${plan.id}.csv")?.let { viewModel.exportCsv(it) } }
                }) { Text("Export CSV") }
                val pending = (state.counts[ActionState.PENDING] ?: 0L) + (state.counts[ActionState.COPIED] ?: 0L) + (state.counts[ActionState.VERIFIED] ?: 0L)
                Button(onClick = { viewModel.execute() }, enabled = pending > 0) { Text(if (plan.status == PlanStatus.PAUSED) "Resume" else "Execute") }
            }
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                FilterChip(selected = state.actionFilter == null, onClick = { viewModel.filterActions(null) }, label = { Text("all (${state.counts.values.sum()})") })
                ActionState.entries.forEach { s ->
                    val n = state.counts[s] ?: 0L
                    FilterChip(selected = state.actionFilter == setOf(s), onClick = { viewModel.filterActions(setOf(s)) }, label = { Text("${s.name.lowercase().replace('_', ' ')} ($n)") })
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${state.filteredTotal} actions", modifier = Modifier.weight(1f))
                TextButton(onClick = { viewModel.previousActions() }, enabled = state.actionOffset > 0) { Text("Previous") }
                TextButton(onClick = { viewModel.nextActions() }, enabled = state.actionOffset + state.pageSize < state.filteredTotal) { Text("Next") }
            }
            HorizontalDivider()
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(state.actions, key = { it.id }) { action ->
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Text("${action.kind.name.lowercase().replace('_', ' ')}  ->  ${action.state.name.lowercase().replace('_', ' ')}", style = MaterialTheme.typography.labelLarge,
                            color = if (action.state == ActionState.FAILED) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
                        Text(action.sourcePath, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        action.destinationPath?.let { Text("to $it", style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        action.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    HorizontalDivider()
                }
            }
        }
    }
}

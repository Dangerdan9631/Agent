package dev.inventory.app.presentation.tags

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import dev.inventory.app.presentation.common.DropdownField
import dev.inventory.core.domain.tag.Tag

/**
 * Tag management: create, rename, recolor, delete, and rule-based bulk tagging.
 */
@Composable
fun TagsScreen(viewModel: TagsViewModel) {
    val state by viewModel.state.collectAsState()
    var newName by remember { mutableStateOf("") }
    var newColor by remember { mutableStateOf(PALETTE.first()) }
    var ruleTag by remember { mutableStateOf<Tag?>(null) }
    var ruleExtensions by remember { mutableStateOf("") }
    var ruleGlob by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Tag?>(null) }
    var editName by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Tags", style = MaterialTheme.typography.headlineSmall)
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("New tag", style = MaterialTheme.typography.titleSmall)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.width(240.dp))
                    PALETTE.forEach { color ->
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .then(if (color == newColor) Modifier.border(2.dp, MaterialTheme.colorScheme.onSurface, CircleShape) else Modifier)
                                .padding(4.dp)
                                .background(Color(0xFF000000 or color.toLong()), CircleShape)
                                .clickable { newColor = color },
                        )
                    }
                    Button(onClick = { viewModel.create(newName, newColor); newName = "" }) { Text("Create") }
                }
            }
        }
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Bulk tag by rule", style = MaterialTheme.typography.titleSmall)
                Text("Tags every present file whose extension is in the list and/or whose relative path matches the glob (use * within a folder and ** across folders).", style = MaterialTheme.typography.bodySmall)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (state.tags.isNotEmpty()) {
                        val selected = ruleTag ?: state.tags.first()
                        DropdownField(label = "Tag", options = state.tags, selected = selected, render = { it.name }, onSelect = { ruleTag = it })
                    }
                    OutlinedTextField(value = ruleExtensions, onValueChange = { ruleExtensions = it }, label = { Text("Extensions (jpg, png)") }, singleLine = true, modifier = Modifier.width(220.dp))
                    OutlinedTextField(value = ruleGlob, onValueChange = { ruleGlob = it }, label = { Text("Path glob (Photos/**)") }, singleLine = true, modifier = Modifier.width(260.dp))
                    Button(onClick = { (ruleTag ?: state.tags.firstOrNull())?.let { viewModel.applyRule(it.id, ruleExtensions, ruleGlob) } }, enabled = state.tags.isNotEmpty()) { Text("Apply") }
                }
                state.message?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary) }
            }
        }
        HorizontalDivider()
        LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            items(state.tags, key = { it.id }) { tag ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.size(16.dp).background(Color(0xFF000000 or tag.color.toLong()), CircleShape))
                    Spacer(Modifier.width(12.dp))
                    if (editing?.id == tag.id) {
                        OutlinedTextField(value = editName, onValueChange = { editName = it }, singleLine = true, modifier = Modifier.width(240.dp))
                        TextButton(onClick = { viewModel.update(tag, editName, tag.color); editing = null }) { Text("Save") }
                        TextButton(onClick = { editing = null }) { Text("Cancel") }
                    } else {
                        Text(tag.name, modifier = Modifier.weight(1f))
                        PALETTE.forEach { color ->
                            TextButton(onClick = { viewModel.update(tag, tag.name, color) }, modifier = Modifier.size(28.dp)) {
                                Box(Modifier.size(12.dp).background(Color(0xFF000000 or color.toLong()), CircleShape))
                            }
                        }
                        TextButton(onClick = { editing = tag; editName = tag.name }) { Text("Rename") }
                        TextButton(onClick = { viewModel.delete(tag) }) { Text("Delete") }
                    }
                }
            }
        }
    }
}

private val PALETTE = listOf(0x1E88E5, 0x43A047, 0xFB8C00, 0xE53935, 0x8E24AA, 0x00ACC1, 0x6D4C41, 0x546E7A)

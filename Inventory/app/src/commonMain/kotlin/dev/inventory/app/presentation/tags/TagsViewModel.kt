package dev.inventory.app.presentation.tags

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.inventory.core.application.tagging.TagRuleApplier
import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.domain.tag.TagRule
import dev.inventory.core.port.TagRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * State and actions for managing tags and applying rule-based bulk tagging.
 */
class TagsViewModel(
    private val tags: TagRepository,
    private val ruleApplier: TagRuleApplier,
) : ViewModel() {
    private val logger = KotlinLogging.logger {}
    private val mutableState = MutableStateFlow(TagsState())

    /**
     * Observable screen state.
     */
    val state: StateFlow<TagsState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    /**
     * Reloads the tag list.
     */
    fun refresh() {
        viewModelScope.launch { mutableState.value = mutableState.value.copy(tags = tags.all()) }
    }

    /**
     * Creates a tag; duplicate names are reported as a message.
     */
    fun create(name: String, color: Int) {
        if (name.isBlank()) return
        viewModelScope.launch {
            try {
                tags.create(name, color)
                mutableState.value = mutableState.value.copy(message = null)
            } catch (e: Exception) {
                logger.warn { "Create tag failed: ${e.message}" }
                mutableState.value = mutableState.value.copy(message = "Could not create tag: ${e.message}")
            }
            refresh()
        }
    }

    /**
     * Renames or recolors a tag.
     */
    fun update(tag: Tag, name: String, color: Int) {
        viewModelScope.launch {
            try {
                tags.update(tag.id, name, color)
            } catch (e: Exception) {
                mutableState.value = mutableState.value.copy(message = "Could not update tag: ${e.message}")
            }
            refresh()
        }
    }

    /**
     * Deletes a tag and all of its assignments.
     */
    fun delete(tag: Tag) {
        viewModelScope.launch {
            tags.delete(tag.id)
            refresh()
        }
    }

    /**
     * Applies a rule built from a comma-separated extension list and an optional path glob.
     */
    fun applyRule(tagId: Long, extensionsText: String, glob: String) {
        viewModelScope.launch {
            val extensions = extensionsText.split(',', ' ', ';').map { it.trim().lowercase().removePrefix(".") }.filter { it.isNotEmpty() }.toSet()
            val rule = TagRule(tagId, extensions, glob.ifBlank { null })
            if (rule.extensions.isEmpty() && rule.pathGlob == null) {
                mutableState.value = mutableState.value.copy(message = "A rule needs at least one extension or a path glob")
                return@launch
            }
            mutableState.value = mutableState.value.copy(message = "Applying rule...")
            val count = ruleApplier.apply(rule)
            mutableState.value = mutableState.value.copy(message = "Tagged $count files")
        }
    }

    /**
     * Screen state for tag management.
     */
    data class TagsState(
        val tags: List<Tag> = emptyList(),
        val message: String? = null,
    )
}

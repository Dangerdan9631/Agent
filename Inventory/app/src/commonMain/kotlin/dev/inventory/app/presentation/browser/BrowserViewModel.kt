package dev.inventory.app.presentation.browser

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.inventory.app.presentation.common.BackgroundTaskRunner
import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.Clock
import dev.inventory.core.port.DirectChildren
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.TagRepository
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * State and actions for browsing, filtering, selecting, tagging, and deciding on files.
 */
class BrowserViewModel(
    private val files: FileEntryRepository,
    private val volumes: VolumeRepository,
    private val tags: TagRepository,
    private val decisions: FileDecisionRepository,
    private val detailLoader: FileDetailLoader,
    private val clock: Clock,
    private val tasks: BackgroundTaskRunner,
) : ViewModel() {
    private val logger = KotlinLogging.logger {}
    private val mutableState = MutableStateFlow(BrowserState())
    private var loadJob: Job? = null

    /**
     * Observable screen state.
     */
    val state: StateFlow<BrowserState> = mutableState.asStateFlow()

    init {
        reloadLookups()
        load()
        viewModelScope.launch { tasks.completions.collect { reloadLookups(); load() } }
    }

    /**
     * Replaces the query, clears the tree, and reloads totals.
     */
    fun updateQuery(query: FileQuery) {
        mutableState.value = mutableState.value.copy(
            query = query,
            expanded = emptySet(),
            children = emptyMap(),
            selected = emptySet(),
            tagsByFile = emptyMap(),
            decisionsByFile = emptyMap(),
            treeRows = emptyList(),
        )
        load()
    }

    /**
     * Expands or collapses a volume root.
     */
    fun toggleVolume(volumeId: Long) {
        toggleBranch(volumeKey(volumeId), volumeId, "")
    }

    /**
     * Expands or collapses a folder under a volume.
     */
    fun toggleFolder(volumeId: Long, relativePath: String) {
        toggleBranch(folderKey(volumeId, relativePath), volumeId, relativePath)
    }

    /**
     * Adds or removes a file from the selection.
     */
    fun toggleSelected(fileId: Long) {
        val s = mutableState.value
        mutableState.value = s.copy(selected = if (fileId in s.selected) s.selected - fileId else s.selected + fileId)
    }

    /**
     * Clears the selection.
     */
    fun clearSelection() {
        mutableState.value = mutableState.value.copy(selected = emptySet())
    }

    /**
     * Loads the detail panel for a file.
     */
    fun showDetail(file: FileEntry) {
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(detail = null, detailLoading = true)
            val detail = runCatching { detailLoader.load(file) }.onFailure { logger.warn(it) { "Detail failed for ${file.relativePath}" } }.getOrNull()
            mutableState.value = mutableState.value.copy(detail = detail, detailLoading = false)
        }
    }

    /**
     * Closes the detail panel.
     */
    fun closeDetail() {
        mutableState.value = mutableState.value.copy(detail = null)
    }

    /**
     * Attaches a tag to the selected files (or to targetIds when provided) and reloads.
     */
    fun attachTag(tagId: Long, targetIds: Collection<Long> = mutableState.value.selected) {
        if (targetIds.isEmpty()) return
        viewModelScope.launch {
            tags.attach(targetIds, tagId)
            logger.info { "Attached tag $tagId to ${targetIds.size} files" }
            afterMutation(targetIds)
        }
    }

    /**
     * Removes a tag from the selected files (or from targetIds when provided) and reloads.
     */
    fun detachTag(tagId: Long, targetIds: Collection<Long> = mutableState.value.selected) {
        if (targetIds.isEmpty()) return
        viewModelScope.launch {
            tags.detach(targetIds, tagId)
            afterMutation(targetIds)
        }
    }

    /**
     * Records a decision for the selected files (or targetIds when provided); UNDECIDED clears the decision.
     */
    fun setDecision(decision: Decision, targetIds: Collection<Long> = mutableState.value.selected) {
        if (targetIds.isEmpty()) return
        viewModelScope.launch {
            if (decision == Decision.UNDECIDED) decisions.clear(targetIds) else decisions.set(targetIds, decision, null, clock.now())
            logger.info { "Set decision $decision on ${targetIds.size} files" }
            afterMutation(targetIds)
        }
    }

    private suspend fun afterMutation(touched: Collection<Long>) {
        load()
        val detail = mutableState.value.detail
        if (detail != null && detail.file.id in touched) showDetail(detail.file)
    }

    private fun reloadLookups() {
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(
                volumes = volumes.all(),
                tags = tags.all(),
                extensions = files.distinctExtensions(),
            )
        }
    }

    private fun toggleBranch(key: String, volumeId: Long, parentPath: String) {
        val s = mutableState.value
        if (key in s.expanded) {
            val toRemove = descendantKeys(s.expanded, key)
            publish(s.copy(expanded = s.expanded - toRemove, children = s.children.filterKeys { it !in toRemove }))
            return
        }
        val expanded = s.expanded + key
        publish(s.copy(expanded = expanded))
        if (key !in s.children) {
            viewModelScope.launch { loadBranch(key, volumeId, parentPath) }
        }
    }

    private fun load() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val s = mutableState.value
            mutableState.value = s.copy(loading = true)
            val vols = volumes.all()
            val total = files.count(s.query)
            val bytes = files.totalBytes(s.query)
            val visible = visibleVolumes(vols, s.query)
            var expanded = s.expanded
            val single = visible.singleOrNull()
            if (single != null && volumeKey(single.id) !in expanded) {
                expanded = expanded + volumeKey(single.id)
            }
            val base = s.copy(
                volumes = vols,
                total = total,
                totalBytes = bytes,
                expanded = expanded,
                children = emptyMap(),
                tagsByFile = emptyMap(),
                decisionsByFile = emptyMap(),
                loading = false,
            )
            publish(base)
            refreshExpandedBranches()
        }
    }

    private suspend fun loadBranch(key: String, volumeId: Long, parentPath: String) {
        val s = mutableState.value
        mutableState.value = s.copy(loadingChildren = s.loadingChildren + key)
        val children = files.directChildren(volumeId, parentPath, s.query)
        val merged = mergeLookups(s, children)
        mutableState.value = merged.copy(
            children = merged.children + (key to children),
            loadingChildren = merged.loadingChildren - key,
        )
        publish(mutableState.value)
    }

    private suspend fun refreshExpandedBranches() {
        val s = mutableState.value
        if (s.expanded.isEmpty()) {
            publish(s.copy(treeRows = buildTreeRows(s)))
            return
        }
        var current = s.copy(loadingChildren = s.expanded)
        publish(current)
        val newChildren = LinkedHashMap<String, DirectChildren>()
        var tagsByFile = emptyMap<Long, List<Tag>>()
        var decisionsByFile = emptyMap<Long, Decision>()
        for (key in s.expanded) {
            val (volumeId, parentPath) = parseKey(key) ?: continue
            val children = files.directChildren(volumeId, parentPath, s.query)
            newChildren[key] = children
            tagsByFile = tagsByFile + tags.tagsForFiles(children.files.map { it.id })
            decisionsByFile = decisionsByFile + decisions.forFiles(children.files.map { it.id }).mapValues { it.value.decision }
        }
        current = current.copy(
            children = newChildren,
            tagsByFile = tagsByFile,
            decisionsByFile = decisionsByFile,
            loadingChildren = emptySet(),
        )
        publish(current)
    }

    private suspend fun mergeLookups(s: BrowserState, children: DirectChildren): BrowserState {
        val tagMap = tags.tagsForFiles(children.files.map { it.id })
        val decisionMap = decisions.forFiles(children.files.map { it.id })
        return s.copy(
            tagsByFile = s.tagsByFile + tagMap,
            decisionsByFile = s.decisionsByFile + decisionMap.mapValues { it.value.decision },
        )
    }

    private fun publish(s: BrowserState) {
        mutableState.value = s.copy(treeRows = buildTreeRows(s))
    }

    private fun buildTreeRows(state: BrowserState): List<BrowserTreeRow> {
        val rows = ArrayList<BrowserTreeRow>()
        for (volume in visibleVolumes(state.volumes, state.query)) {
            rows += BrowserTreeRow.VolumeRow(volume, depth = 0)
            if (volumeKey(volume.id) in state.expanded) {
                appendChildren(state, volume.id, parentPath = "", depth = 1, rows)
            }
        }
        return rows
    }

    private fun appendChildren(state: BrowserState, volumeId: Long, parentPath: String, depth: Int, rows: MutableList<BrowserTreeRow>) {
        val key = if (parentPath.isEmpty()) volumeKey(volumeId) else folderKey(volumeId, parentPath)
        val children = state.children[key] ?: return
        for (folder in children.folders) {
            rows += BrowserTreeRow.FolderRow(volumeId, folder, depth)
            val childKey = folderKey(volumeId, folder.relativePath)
            if (childKey in state.expanded) {
                appendChildren(state, volumeId, folder.relativePath, depth + 1, rows)
            }
        }
        for (file in children.files) {
            rows += BrowserTreeRow.FileRow(file, depth)
        }
    }

    private fun visibleVolumes(volumes: List<Volume>, query: FileQuery): List<Volume> =
        volumes.filter { query.volumeIds.isEmpty() || it.id in query.volumeIds }

    private fun volumeKey(volumeId: Long): String = "v:$volumeId"

    private fun folderKey(volumeId: Long, relativePath: String): String = "d:$volumeId:$relativePath"

    private fun parseKey(key: String): Pair<Long, String>? =
        when {
            key.startsWith("v:") -> key.removePrefix("v:").toLongOrNull()?.let { it to "" }
            key.startsWith("d:") -> {
                val rest = key.removePrefix("d:")
                val volumeId = rest.substringBefore(':').toLongOrNull() ?: return null
                val path = rest.substringAfter(':', "")
                volumeId to path
            }
            else -> null
        }

    private fun descendantKeys(allExpanded: Set<String>, key: String): Set<String> {
        val removed = mutableSetOf(key)
        when {
            key.startsWith("v:") -> {
                val volumeId = key.removePrefix("v:")
                removed += allExpanded.filter { it.startsWith("d:$volumeId:") }
            }
            key.startsWith("d:") -> {
                val rest = key.removePrefix("d:")
                val volumeId = rest.substringBefore(':')
                val path = rest.substringAfter(':', "")
                val prefix = "$path/"
                removed += allExpanded.filter {
                    it.startsWith("d:$volumeId:") && it.removePrefix("d:$volumeId:").let { tail ->
                        tail != path && tail.startsWith(prefix)
                    }
                }
            }
        }
        return removed
    }

    /**
     * Screen state for the file browser.
     */
    data class BrowserState(
        val query: FileQuery = FileQuery(),
        val treeRows: List<BrowserTreeRow> = emptyList(),
        val expanded: Set<String> = emptySet(),
        val children: Map<String, DirectChildren> = emptyMap(),
        val total: Long = 0,
        val totalBytes: Long = 0,
        val tagsByFile: Map<Long, List<Tag>> = emptyMap(),
        val decisionsByFile: Map<Long, Decision> = emptyMap(),
        val selected: Set<Long> = emptySet(),
        val volumes: List<Volume> = emptyList(),
        val tags: List<Tag> = emptyList(),
        val extensions: List<String> = emptyList(),
        val detail: FileDetail? = null,
        val detailLoading: Boolean = false,
        val loading: Boolean = false,
        val loadingChildren: Set<String> = emptySet(),
    )
}

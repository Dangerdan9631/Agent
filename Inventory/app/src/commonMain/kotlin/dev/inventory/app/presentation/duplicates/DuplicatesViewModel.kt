package dev.inventory.app.presentation.duplicates

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.inventory.app.presentation.common.BackgroundTaskRunner
import dev.inventory.app.presentation.common.TaskLane
import dev.inventory.core.application.duplicates.DuplicateAnalysis
import dev.inventory.core.application.keeper.GroupResolutionService
import dev.inventory.core.application.keeper.KeeperPolicyKind
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.DirectoryEntryRepository
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.DuplicateGroupSummary
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * State and actions for reviewing duplicate groups and choosing keepers.
 */
class DuplicatesViewModel(
    private val groups: DuplicateGroupRepository,
    private val files: FileEntryRepository,
    private val directories: DirectoryEntryRepository,
    private val decisions: FileDecisionRepository,
    private val volumes: VolumeRepository,
    private val fileSystem: FileSystemPort,
    private val analysis: DuplicateAnalysis,
    private val resolution: GroupResolutionService,
    private val tasks: BackgroundTaskRunner,
) : ViewModel() {
    private val logger = KotlinLogging.logger {}
    private val mutableState = MutableStateFlow(DuplicatesState())
    private var lastGroupRefreshAt = 0L
    private var lastGroupsSeen = -1L

    /**
     * Observable screen state.
     */
    val state: StateFlow<DuplicatesState> = mutableState.asStateFlow()

    init {
        load()
        viewModelScope.launch { tasks.completions.collect { load() } }
    }

    /**
     * Switches the visible group kind.
     */
    fun selectKind(kind: DuplicateGroupKind) {
        mutableState.value = mutableState.value.copy(kind = kind, offset = 0, detail = null)
        load()
    }

    /**
     * Switches the review-state filter; null shows every group.
     */
    fun selectReviewState(state: ReviewState?) {
        mutableState.value = mutableState.value.copy(reviewState = state, offset = 0, detail = null)
        load()
    }

    /**
     * Moves to the next page of groups.
     */
    fun nextPage() {
        val s = mutableState.value
        if (s.offset + PAGE < s.total) {
            mutableState.value = s.copy(offset = s.offset + PAGE)
            load()
        }
    }

    /**
     * Moves to the previous page of groups.
     */
    fun previousPage() {
        val s = mutableState.value
        if (s.offset > 0) {
            mutableState.value = s.copy(offset = maxOf(0, s.offset - PAGE))
            load()
        }
    }

    /**
     * Runs the full duplicate analysis as the background task.
     */
    fun runAnalysis() {
        lastGroupsSeen = -1L
        lastGroupRefreshAt = 0L
        val started = tasks.start("Analyzing duplicates", analysis.run(), TaskLane.ANALYSIS) { p ->
            refreshWhileRunning(p.groupsFound)
            val fraction = p.total?.takeIf { it > 0 }?.let { (p.done.toFloat() / it).coerceIn(0f, 1f) }
            val progress = "${p.phase}: ${p.done}${p.total?.let { "/$it" } ?: ""} ${p.current}".trim()
            BackgroundTaskRunner.TaskStatus.Detail("$progress · ${p.groupsFound} groups", fraction)
        }
        if (!started) mutableState.value = mutableState.value.copy(message = "Another task is running")
    }

    private fun refreshWhileRunning(groupsFound: Long) {
        if (groupsFound == lastGroupsSeen) return
        val now = System.currentTimeMillis()
        if (lastGroupRefreshAt != 0L && now - lastGroupRefreshAt < REFRESH_MILLIS) return
        lastGroupsSeen = groupsFound
        lastGroupRefreshAt = now
        load()
    }

    /**
     * Loads a group's members into the detail pane.
     */
    fun showGroup(groupId: Long) {
        viewModelScope.launch {
            val group = groups.byId(groupId) ?: return@launch
            val members = groups.members(groupId)
            val volumeMap = volumes.all().associateBy(Volume::id)
            val detail = if (group.kind == DuplicateGroupKind.FOLDER) {
                val dirs = directories.byIds(members.map { it.memberId }).associateBy { it.id }
                val ordered = members.mapNotNull { dirs[it.memberId] }
                val source = ordered.firstOrNull { it.id == group.keeperFileId } ?: ordered.firstOrNull()
                val tree = if (source == null) {
                    emptyList()
                } else {
                    contentTree(source.relativePath, files.presentUnder(source.volumeId, source.relativePath))
                }
                GroupDetail(
                    group, members, emptyList(), ordered, emptyMap(),
                    ordered.associate { it.id to resolve(volumeMap, it.volumeId, it.relativePath) },
                    tree,
                )
            } else {
                val entries = files.byIds(members.map { it.memberId }).associateBy { it.id }
                val ordered = members.mapNotNull { entries[it.memberId] }
                GroupDetail(
                    group, members, ordered, emptyList(),
                    decisions.forFiles(ordered.map { it.id }).mapValues { it.value.decision },
                    ordered.associate { it.id to resolve(volumeMap, it.volumeId, it.relativePath) },
                )
            }
            mutableState.value = mutableState.value.copy(detail = detail)
        }
    }

    /**
     * Chooses the keeper member (a file, or a directory for a folder group) and marks the other copies DISCARD.
     */
    fun chooseKeeper(groupId: Long, fileId: Long) {
        viewModelScope.launch {
            resolution.resolve(groupId, fileId)
            load()
            showGroup(groupId)
        }
    }

    /**
     * Dismisses the group as a false positive.
     */
    fun dismiss(groupId: Long) {
        viewModelScope.launch {
            resolution.dismiss(groupId)
            load()
            showGroup(groupId)
        }
    }

    /**
     * Reopens a resolved or dismissed group.
     */
    fun reopen(groupId: Long) {
        viewModelScope.launch {
            resolution.reopen(groupId)
            load()
            showGroup(groupId)
        }
    }

    /**
     * Applies a keeper policy to every OPEN group of the visible kind.
     */
    fun applyPolicy(policy: KeeperPolicyKind, preferredVolumeIds: List<Long>) {
        val kind = mutableState.value.kind
        viewModelScope.launch {
            val count = runCatching { resolution.applyPolicy(kind, policy, preferredVolumeIds) }
                .onFailure { logger.warn(it) { "Apply policy failed" } }
                .getOrElse { 0 }
            mutableState.value = mutableState.value.copy(message = "Resolved $count groups with ${policy.name.lowercase().replace('_', ' ')}")
            load()
        }
    }

    private fun resolve(volumeMap: Map<Long, Volume>, volumeId: Long, relativePath: String): String =
        volumeMap[volumeId]?.let { fileSystem.resolve(it.rootPath, relativePath) } ?: relativePath

    private fun contentTree(directoryPath: String, entries: List<FileEntry>): List<ContentNode> {
        class MutableNode(val name: String, val path: String) {
            var file: FileEntry? = null
            val children = LinkedHashMap<String, MutableNode>()
        }
        val roots = LinkedHashMap<String, MutableNode>()
        for (entry in entries) {
            val relative = if (directoryPath.isEmpty()) entry.relativePath else entry.relativePath.removePrefix("$directoryPath/")
            if (relative.isEmpty()) continue
            val parts = relative.split('/')
            var siblings = roots
            var parentPath = ""
            for ((index, part) in parts.withIndex()) {
                val path = if (parentPath.isEmpty()) part else "$parentPath/$part"
                val node = siblings.getOrPut(part) { MutableNode(part, path) }
                if (index == parts.lastIndex) node.file = entry
                parentPath = path
                siblings = node.children
            }
        }
        fun freeze(nodes: Map<String, MutableNode>): List<ContentNode> =
            nodes.values
                .sortedWith(compareBy<MutableNode> { it.file != null && it.children.isEmpty() }.thenBy { it.name.lowercase() })
                .map { ContentNode(it.name, it.path, it.file, freeze(it.children)) }
        return freeze(roots)
    }

    private fun load() {
        viewModelScope.launch {
            val s = mutableState.value
            val summaries = groups.summaries(s.kind, s.reviewState, PAGE, s.offset)
            val total = groups.count(s.kind, s.reviewState)
            val counts = DuplicateGroupKind.entries.associateWith { groups.count(it, ReviewState.OPEN) }
            val detail = mutableState.value.detail?.takeIf { groups.byId(it.group.id) != null }
            mutableState.value = mutableState.value.copy(
                summaries = summaries,
                total = total,
                openCounts = counts,
                volumes = volumes.all(),
                detail = detail,
            )
        }
    }

    /**
     * Screen state for duplicate review.
     */
    data class DuplicatesState(
        val kind: DuplicateGroupKind = DuplicateGroupKind.EXACT,
        val reviewState: ReviewState? = ReviewState.OPEN,
        val offset: Int = 0,
        val summaries: List<DuplicateGroupSummary> = emptyList(),
        val total: Long = 0,
        val openCounts: Map<DuplicateGroupKind, Long> = emptyMap(),
        val volumes: List<Volume> = emptyList(),
        val detail: GroupDetail? = null,
        val message: String? = null,
    ) {
        /**
         * Page size used for paging controls.
         */
        val pageSize: Int
            get() = PAGE
    }

    private companion object {
        const val PAGE = 100
        const val REFRESH_MILLIS = 1_000L
    }
}

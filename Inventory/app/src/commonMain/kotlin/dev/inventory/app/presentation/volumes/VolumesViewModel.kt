package dev.inventory.app.presentation.volumes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.inventory.app.presentation.common.BackgroundTaskRunner
import dev.inventory.app.presentation.common.TaskLane
import dev.inventory.core.application.scanning.VolumeScanner
import dev.inventory.core.domain.volume.Scan
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.ScanRepository
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch

/**
 * State and actions for registering volumes and running scans.
 */
class VolumesViewModel(
    private val volumes: VolumeRepository,
    private val scans: ScanRepository,
    private val files: FileEntryRepository,
    private val scanner: VolumeScanner,
    private val tasks: BackgroundTaskRunner,
) : ViewModel() {
    private val logger = KotlinLogging.logger {}
    private val mutableState = MutableStateFlow(VolumesState())

    /**
     * Observable screen state.
     */
    val state: StateFlow<VolumesState> = mutableState.asStateFlow()

    init {
        refresh()
        viewModelScope.launch { tasks.completions.collect { refresh() } }
    }

    /**
     * Reloads volumes and their scan history.
     */
    fun refresh() {
        viewModelScope.launch {
            val all = volumes.all()
            val rows = all.map { volume ->
                VolumeRow(
                    volume = volume,
                    latestScan = scans.latestForVolume(volume.id),
                    history = scans.forVolume(volume.id).take(10),
                    presentFiles = files.count(FileQuery(volumeIds = setOf(volume.id))),
                    presentBytes = files.totalBytes(FileQuery(volumeIds = setOf(volume.id))),
                    missingFiles = files.count(FileQuery(volumeIds = setOf(volume.id), presence = dev.inventory.core.domain.file.FilePresence.MISSING)),
                )
            }
            mutableState.value = mutableState.value.copy(rows = rows, message = null)
        }
    }

    /**
     * Registers a new volume rooted at path with the given label and scans it immediately.
     */
    fun addVolume(path: String, label: String) {
        viewModelScope.launch {
            try {
                val volume = volumes.add(label.ifBlank { path }, path)
                logger.info { "Added volume ${volume.id} '${volume.label}' at $path" }
                refresh()
                scan(volume)
            } catch (e: Exception) {
                logger.warn(e) { "Could not add volume $path" }
                mutableState.value = mutableState.value.copy(message = "Could not add volume: ${e.message}")
            }
        }
    }

    /**
     * Renames a volume.
     */
    fun rename(volume: Volume, label: String) {
        viewModelScope.launch {
            volumes.rename(volume.id, label)
            refresh()
        }
    }

    /**
     * Deletes a volume and every inventory row that references it.
     */
    fun delete(volume: Volume) {
        viewModelScope.launch {
            volumes.delete(volume.id)
            logger.info { "Deleted volume ${volume.id}" }
            refresh()
        }
    }

    /**
     * Starts a scan of one volume as the background task.
     */
    fun scan(volume: Volume) {
        val started = tasks.start("Scanning ${volume.label}", scanner.scan(volume), TaskLane.SCAN) { p ->
            BackgroundTaskRunner.TaskStatus.Detail("${p.phase}: ${p.filesSeen} files, ${p.newFiles} new, ${p.changedFiles} changed, ${p.hashed} hashed - ${p.currentPath}", null)
        }
        if (!started) mutableState.value = mutableState.value.copy(message = "Another task is running")
    }

    /**
     * Scans every registered volume in sequence as one background task.
     */
    fun scanAll() {
        val all = mutableState.value.rows.map { it.volume }
        if (all.isEmpty()) return
        val combined = flow {
            all.forEachIndexed { index, volume ->
                scanner.scan(volume).collect { emit(Triple(index, volume, it)) }
            }
        }
        val started = tasks.start("Scanning all volumes", combined, TaskLane.SCAN) { (index, volume, p) ->
            BackgroundTaskRunner.TaskStatus.Detail("[${index + 1}/${all.size}] ${volume.label}: ${p.phase}: ${p.filesSeen} files - ${p.currentPath}", null)
        }
        if (!started) mutableState.value = mutableState.value.copy(message = "Another task is running")
    }

    /**
     * Screen state for the volumes list.
     */
    data class VolumesState(
        /**
         * One row per registered volume.
         */
        val rows: List<VolumeRow> = emptyList(),
        /**
         * Transient message to show the user, or null.
         */
        val message: String? = null,
    )

    /**
     * A volume with its scan history and inventory figures.
     */
    data class VolumeRow(
        val volume: Volume,
        val latestScan: Scan?,
        val history: List<Scan>,
        val presentFiles: Long,
        val presentBytes: Long,
        val missingFiles: Long,
    )
}

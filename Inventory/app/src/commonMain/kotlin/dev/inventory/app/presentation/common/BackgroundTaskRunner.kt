package dev.inventory.app.presentation.common

import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Which background work may overlap. Scan and analysis run together. Exclusive work waits until both are idle.
 */
enum class TaskLane {
    /**
     * Volume walking and quick hashing.
     */
    SCAN,

    /**
     * Duplicate detection.
     */
    ANALYSIS,

    /**
     * Work that must not overlap a scan or analysis, such as consolidation.
     */
    EXCLUSIVE,
}

/**
 * Runs scan and analysis at the same time, and keeps consolidation exclusive of both.
 */
class BackgroundTaskRunner(
    private val scope: CoroutineScope,
) {
    private val logger = KotlinLogging.logger {}
    private val mutableStatuses = MutableStateFlow<List<TaskStatus>>(emptyList())
    private val mutableCompletions = MutableSharedFlow<String>(extraBufferCapacity = 16)
    private val jobs = HashMap<TaskLane, Job>()

    /**
     * Status of every lane that has been started, newest update last within each replacement.
     */
    val statuses: StateFlow<List<TaskStatus>> = mutableStatuses.asStateFlow()

    /**
     * Emits the task name whenever a task finishes, successfully or not, so screens can reload.
     */
    val completions: SharedFlow<String> = mutableCompletions.asSharedFlow()

    /**
     * Returns true when the lane has a running job.
     */
    fun isLaneActive(lane: TaskLane): Boolean = jobs[lane]?.isActive == true

    /**
     * Starts collecting the flow on a lane. Returns false when that lane, or any lane for exclusive work, is already busy.
     */
    fun <T> start(
        name: String,
        work: Flow<T>,
        lane: TaskLane = TaskLane.EXCLUSIVE,
        describe: (T) -> TaskStatus.Detail,
    ): Boolean {
        if (!canStart(lane)) return false
        publish(TaskStatus(name, "Starting", null, running = true, error = null, lane = lane))
        jobs[lane] = scope.launch {
            try {
                work.collect { item ->
                    val detail = describe(item)
                    publish(TaskStatus(name, detail.text, detail.fraction, running = true, error = null, lane = lane))
                }
                publish(TaskStatus(name, "Done", 1f, running = false, error = null, lane = lane))
            } catch (e: CancellationException) {
                publish(TaskStatus(name, "Cancelled", null, running = false, error = null, lane = lane))
            } catch (e: Exception) {
                logger.error(e) { "Task $name failed" }
                publish(TaskStatus(name, "Failed", null, running = false, error = e.message ?: e::class.simpleName, lane = lane))
            } finally {
                mutableCompletions.tryEmit(name)
            }
        }
        return true
    }

    /**
     * Cancels the running task on one lane.
     */
    fun cancel(lane: TaskLane) {
        jobs[lane]?.cancel()
    }

    private fun canStart(lane: TaskLane): Boolean {
        if (lane == TaskLane.EXCLUSIVE) return jobs.values.none { it.isActive }
        if (jobs[TaskLane.EXCLUSIVE]?.isActive == true) return false
        return jobs[lane]?.isActive != true
    }

    private fun publish(status: TaskStatus) {
        mutableStatuses.value = mutableStatuses.value.filterNot { it.lane == status.lane } + status
    }

    /**
     * Status of one lane's current or most recent task.
     */
    data class TaskStatus(
        /**
         * Task name shown as a heading.
         */
        val name: String,
        /**
         * One-line progress description.
         */
        val detail: String,
        /**
         * Completion fraction 0..1, or null when indeterminate.
         */
        val fraction: Float?,
        /**
         * True while the task is still running.
         */
        val running: Boolean,
        /**
         * Failure message when the task ended with an error.
         */
        val error: String?,
        /**
         * Lane this status belongs to.
         */
        val lane: TaskLane,
    ) {
        /**
         * Progress description derived from one emitted item.
         */
        data class Detail(
            /**
             * Progress text.
             */
            val text: String,
            /**
             * Completion fraction 0..1, or null when indeterminate.
             */
            val fraction: Float?,
        )
    }
}

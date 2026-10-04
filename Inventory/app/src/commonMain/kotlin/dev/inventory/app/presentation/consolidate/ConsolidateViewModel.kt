package dev.inventory.app.presentation.consolidate

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.inventory.app.presentation.common.BackgroundTaskRunner
import dev.inventory.core.application.consolidation.ConsolidationExecutor
import dev.inventory.core.application.consolidation.ConsolidationPlanner
import dev.inventory.core.application.consolidation.PlanRequest
import dev.inventory.core.application.report.CsvReportWriter
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConflictPolicyKind
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.LayoutStrategyKind
import dev.inventory.core.domain.volume.Volume
import dev.inventory.core.port.Clock
import dev.inventory.core.port.ConsolidationRepository
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * State and actions for building, previewing, executing, and auditing consolidation plans.
 */
class ConsolidateViewModel(
    private val plans: ConsolidationRepository,
    private val volumes: VolumeRepository,
    private val planner: ConsolidationPlanner,
    private val executor: ConsolidationExecutor,
    private val report: CsvReportWriter,
    private val clock: Clock,
    private val tasks: BackgroundTaskRunner,
) : ViewModel() {
    private val logger = KotlinLogging.logger {}
    private val mutableState = MutableStateFlow(ConsolidateState())

    /**
     * Observable screen state.
     */
    val state: StateFlow<ConsolidateState> = mutableState.asStateFlow()

    init {
        refresh()
        viewModelScope.launch { tasks.completions.collect { refresh() } }
    }

    /**
     * Updates the plan form.
     */
    fun updateForm(form: PlanForm) {
        mutableState.value = mutableState.value.copy(form = form)
    }

    /**
     * Builds a DRAFT plan from the form (a dry run) and shows its actions.
     */
    fun createPlan() {
        val form = mutableState.value.form
        if (form.destinationRoot.isBlank()) {
            mutableState.value = mutableState.value.copy(message = "Choose a destination folder first")
            return
        }
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(message = "Planning...")
            try {
                val plan = planner.plan(PlanRequest(form.destinationRoot, form.layout, form.conflicts, form.removeRedundantExact, form.volumeIds))
                mutableState.value = mutableState.value.copy(message = "Plan ${plan.id} created; review the actions below, then Execute")
                refresh()
                selectPlan(plan.id)
            } catch (e: Exception) {
                logger.warn(e) { "Planning failed" }
                mutableState.value = mutableState.value.copy(message = "Planning failed: ${e.message}")
            }
        }
    }

    /**
     * Loads one plan's counts and first page of actions.
     */
    fun selectPlan(planId: Long) {
        mutableState.value = mutableState.value.copy(selectedPlanId = planId, actionOffset = 0)
        loadActions()
    }

    /**
     * Changes the action state filter for the selected plan.
     */
    fun filterActions(states: Set<ActionState>?) {
        mutableState.value = mutableState.value.copy(actionFilter = states, actionOffset = 0)
        loadActions()
    }

    /**
     * Pages forward through the selected plan's actions.
     */
    fun nextActions() {
        val s = mutableState.value
        if (s.actionOffset + PAGE < s.filteredTotal) {
            mutableState.value = s.copy(actionOffset = s.actionOffset + PAGE)
            loadActions()
        }
    }

    /**
     * Pages backward through the selected plan's actions.
     */
    fun previousActions() {
        val s = mutableState.value
        if (s.actionOffset > 0) {
            mutableState.value = s.copy(actionOffset = maxOf(0, s.actionOffset - PAGE))
            loadActions()
        }
    }

    /**
     * Executes (or resumes) the selected plan as the background task.
     */
    fun execute() {
        val planId = mutableState.value.selectedPlanId ?: return
        val started = tasks.start("Consolidating (plan $planId)", executor.execute(planId)) { p ->
            val fraction = if (p.total > 0) (p.finished.toFloat() / p.total).coerceIn(0f, 1f) else null
            BackgroundTaskRunner.TaskStatus.Detail("${p.phase}: ${p.finished}/${p.total}  ${p.currentPath}", fraction)
        }
        if (!started) mutableState.value = mutableState.value.copy(message = "Another task is running")
    }

    /**
     * Resets FAILED actions of the selected plan to PENDING so Execute retries them.
     */
    fun retryFailed() {
        val planId = mutableState.value.selectedPlanId ?: return
        viewModelScope.launch {
            val reset = plans.resetFailed(planId, clock.now())
            plans.updateStatus(planId, dev.inventory.core.domain.consolidation.PlanStatus.PAUSED)
            mutableState.value = mutableState.value.copy(message = "Reset $reset failed actions")
            refresh()
            loadActions()
        }
    }

    /**
     * Writes the selected plan's journal to a CSV file.
     */
    fun exportCsv(path: String) {
        val planId = mutableState.value.selectedPlanId ?: return
        viewModelScope.launch {
            try {
                val rows = report.write(planId, path)
                mutableState.value = mutableState.value.copy(message = "Wrote $rows rows to $path")
            } catch (e: Exception) {
                mutableState.value = mutableState.value.copy(message = "Export failed: ${e.message}")
            }
        }
    }

    /**
     * Deletes a plan that has not been executed.
     */
    fun deletePlan(planId: Long) {
        viewModelScope.launch {
            plans.deletePlan(planId)
            mutableState.value = mutableState.value.copy(selectedPlanId = null, actions = emptyList(), counts = emptyMap())
            refresh()
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(plans = plans.plans(), volumes = volumes.all())
            if (mutableState.value.selectedPlanId != null) loadActions()
        }
    }

    private fun loadActions() {
        viewModelScope.launch {
            val s = mutableState.value
            val planId = s.selectedPlanId ?: return@launch
            val counts = plans.countsByState(planId)
            val actions = plans.actions(planId, s.actionFilter, PAGE, s.actionOffset)
            val filteredTotal = s.actionFilter?.sumOf { counts[it] ?: 0L } ?: counts.values.sum()
            mutableState.value = mutableState.value.copy(counts = counts, actions = actions, filteredTotal = filteredTotal, selectedPlan = plans.plan(planId))
        }
    }

    /**
     * Form values for a new plan.
     */
    data class PlanForm(
        val destinationRoot: String = "",
        val layout: LayoutStrategyKind = LayoutStrategyKind.PRESERVE_KEEPER_RELATIVE_PATH,
        val conflicts: ConflictPolicyKind = ConflictPolicyKind.RENAME_WITH_SUFFIX,
        val removeRedundantExact: Boolean = true,
        val volumeIds: Set<Long> = emptySet(),
    )

    /**
     * Screen state for consolidation.
     */
    data class ConsolidateState(
        val form: PlanForm = PlanForm(),
        val plans: List<ConsolidationPlan> = emptyList(),
        val volumes: List<Volume> = emptyList(),
        val selectedPlanId: Long? = null,
        val selectedPlan: ConsolidationPlan? = null,
        val counts: Map<ActionState, Long> = emptyMap(),
        val actions: List<ConsolidationAction> = emptyList(),
        val actionFilter: Set<ActionState>? = null,
        val actionOffset: Int = 0,
        val filteredTotal: Long = 0,
        val message: String? = null,
    ) {
        /**
         * Page size used for paging controls.
         */
        val pageSize: Int
            get() = PAGE
    }

    private companion object {
        const val PAGE = 200
    }
}

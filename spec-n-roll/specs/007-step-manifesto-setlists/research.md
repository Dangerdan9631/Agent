# Research: Step Manifestos and Set Lists

## Decision: Centralize step lifecycle in `src/core/step-lifecycle.ts`

**Rationale**: Agents today call `workflow_state_write` directly from generated skills with no enforced init/finalize boundary. A single orchestrator (`runStepInit`, `runStepFinalize`) assembles manifestos, hook instructions, validation gates, and metadata updates. MCP and CLI remain thin wrappers per existing parity pattern (`step_output_instantiate`).

**Alternatives considered**:

- Embed lifecycle only in agent skills (no core API): rejected because skills are prose and cannot enforce completion ordering deterministically (violates FR-002, FR-009).
- Auto-run hooks in engine like today: rejected because spec requires returning hook **instructions** for agents to call, matching `.specify/extensions.yml` speckit pattern.
- Lifecycle only in MCP, no CLI: rejected because FR-001/FR-008 require CLI parity for scripts and debugging.

## Decision: Hook instruction sources — merge `.specify/extensions.yml` and `workflow.config.json` extension hooks

**Rationale**: Two hook systems exist today: Spec Kit YAML (agent-instructed, read by skills) and spec-n-roll extension manifest (auto-dispatched in `executeTierStep`). Step init/finalize must surface **before_{stepId}** and **after_{stepId}** from both sources where configured, normalized to `StepHookInstruction` payloads. Invalid/unreadable hook config is non-blocking diagnostic per spec edge case.

**Alternatives considered**:

- YAML only: rejected because projects already use `workflow.config.json` extension hooks.
- Config only: rejected because bundled speckit extensions use `.specify/extensions.yml`.
- Replace auto-dispatch entirely: deferred — engine may still auto-dispatch for CLI `runRoll` built-in path while agent path uses instructions; document dual behavior in contracts.

## Decision: Persist set lists in `.spec-n-roll/config/set-lists.json`

**Rationale**: Set lists are a distinct concept from workflow step definitions — they add triage description, priority, and enabled flag while referencing a workflow id from `workflow.config.json`. Separate file avoids overloading `workflows[]` and enables migration without breaking existing workflow step config.

**Alternatives considered**:

- Embed in `workflow.config.json` as enriched `workflows[]`: viable but couples triage metadata to step sequences; chosen separate file for clearer CRUD and Ink editing.
- Database or sqlite: rejected — project is file-based config throughout.

## Decision: Remove `WorkflowTierId` union; seed papercut/quick/full only in init defaults

**Rationale**: FR-027 requires zero runtime branches on those names. `assessTriage()` regex heuristics become `evaluateSetListTriage(description, enabled set lists)` using configured descriptions. `DEFAULT_VARIANT_STEPS` map removed; step sequences come from referenced workflow in config. Init seeds three preconfigured set lists with priorities (e.g. papercut=1, quick=2, full=3) as ordinary data.

**Alternatives considered**:

- Keep union type with deprecation: rejected — violates FR-027 spirit.
- ML-based triage: rejected — spec requires description + priority rules only.

## Decision: Manifesto storage under `.spec-n-roll/config/manifesto/`

**Rationale**: Constitution lives in `.specify/memory/constitution.md` (Spec Kit governance). Manifestos are spec-n-roll step-execution rules, distinct scope. Global at `global.md`, step-specific at `steps/{stepId}.md` where `stepId` matches workflow step id (kebab-case). Step init loads both with scope labels (FR-004, FR-005, FR-020).

**Alternatives considered**:

- Single manifesto file with sections: rejected — step-specific editing and `/spec-n-manifesto` single-target model need separate files.
- Store in spec frontmatter: rejected — manifestos are project-global governance, not per task-spec.

## Decision: `/spec-n-manifesto` as agent skill + optional CLI read (agent-primary like constitution)

**Rationale**: Constitution has no TypeScript command — interview loop is skill-driven. Manifesto follows same pattern for authoring (FR-015–FR-019) while **loading** is deterministic in `runStepInit` via `src/manifesto/`. CLI may expose `manifesto show` for debugging; primary authoring is `/spec-n-manifesto` skill generated on init.

**Alternatives considered**:

- Full CLI interview command: rejected for v1 scope — duplicates skill pattern and Ink can cover interactive view/edit for set lists first.
- Manifesto in workflow step: rejected — spec says standalone, not part of workflow.

## Decision: Lifecycle state fields on `workflow-state.json` per active step attempt

**Rationale**: FR-010 requires finalize to verify init ran for same step. Add `lifecycle: { initAt, finalizedAt, stepId }` (or equivalent) to per-spec workflow state. Idempotent finalize (second call reports completed state, no duplicate metadata writes).

**Alternatives considered**:

- Separate lifecycle session file: rejected — adds sync burden with existing workflow state.
- In-memory only: rejected — agents may restart between init and finalize.

## Decision: Skill metadata injection in `workflow-skills.ts`

**Rationale**: FR-033/FR-034 require `metadata.author: spec-n-roll` and `metadata.version` from `readToolkitPackageVersion()`. Apply only to managed skills in `listWorkflowSkillUpdates()` manifest; skip files not in managed list (FR-035).

**Alternatives considered**:

- Post-process all `.agents/skills/**`: rejected — would touch user skills.
- Version in skill body only: rejected — frontmatter is machine-readable for tooling.

## Decision: Ink — set list management first; manifesto view/edit secondary

**Rationale**: FR-030 requires Ink for set lists (list, enable/disable, edit descriptions). Manifesto Ink can start with read-only view + link to `/spec-n-manifesto` for authoring, matching constitution (no Ink constitution editor today). Expand if time permits in implementation.

**Alternatives considered**:

- Full manifesto Ink editor in v1: higher scope; spec allows CLI/MCP/INK parity but manifesto authoring is skill-primary.

## Decision: Migration — rename user-facing strings; alias `workflowVariantId` in state internally

**Rationale**: Pre-1.0 freedom (Principle V). `workflow-state.json` may keep `workflowVariantId` field storing selected set list's workflow reference id for minimal churn; user-facing text and new APIs use "set list". Migration helper on read: if `set-lists.json` missing but `workflow.config.json` has legacy-only shape, generate set lists from workflows on first init/update.

**Alternatives considered**:

- Breaking rename of persisted field: rejected — risks user data without strong benefit pre-1.0.
- No migration: rejected — FR-032 requires guidance for complexity terminology.

## Decision: Triage priority tie-break — lowest priority number wins

**Rationale**: FR-025 explicit. When descriptions overlap and agent uncertain, core `selectSetListByPriority()` applies deterministic tie-break; response may include `ambiguous: true` with selected id for agent transparency.

**Alternatives considered**:

- Random selection: rejected.
- Always ask user: rejected for automated specify path unless no enabled lists.

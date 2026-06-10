Rock out with your docs out.

You write the setlist, AI plays the show. Turn requirements up to 11.

Ship fast. Stay loud.

---

`https://speckit.org/` (https://github.com/github/spec-kit)
https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd
https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md

---

Interview me relentlessly about every aspect of the spec in `D:\Dan\Source\GitHub\Dangerdan9631\Agent\spec-n-roll\specs\001-spec-n-roll-toolkit\spec.md` until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the documented clarifications, use those instead.

Once all questions are answered, use the `/speckit-clarify` command to update the specification.

---

# Spec Kit (Speckit) Architecture Deep Wiki

## Overview

Spec Kit (Speckit) is a specification-driven development (SDD) framework that provides a structured workflow for building software features through a series of AI-assisted commands. It enforces separation between business requirements (specification) and technical implementation (planning), with quality gates and validation at each stage.

## Core Philosophy

- **Specification-First**: Business requirements are captured without implementation details
- **Layered Architecture**: Enforces clean separation between policy/domain code and external adapters
- **Quality Gates**: Constitution compliance and validation checks at each phase
- **Incremental Delivery**: User stories organized by priority with independent testability
- **Extensibility**: Hook system for custom automation and integrations

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPECKIT WORKFLOW SYSTEM                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   User Input     │
│  (Feature Desc)  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: SPECIFICATION (/speckit-specify)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Pre-Execution Hooks (before_specify)                                    │
│     └─ Git branch creation (via git extension)                              │
│  2. Generate feature short name (2-4 words)                                 │
│  3. Create spec directory (specs/###-feature-name/)                         │
│  4. Copy spec-template.md → spec.md                                         │
│  5. Fill spec with user stories, requirements, success criteria             │
│  6. Spec Quality Validation (checklists/requirements.md)                    │
│  7. Post-Execution Hooks (after_specify)                                    │
│     └─ Agent context update (speckit.agent-context.update)                  │
│                                                                             │
│ OUTPUT: specs/###-feature-name/spec.md + checklists/requirements.md         │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (User Review Gate)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: CLARIFICATION (/speckit-clarify) [OPTIONAL]                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Pre-Execution Hooks (before_clarify)                                    │
│  2. Load spec.md and constitution.md                                        │
│  3. Scan for ambiguities across 10 categories                               │
│  4. Interactive questioning (max 5 questions)                               │
│  5. Integrate answers into spec.md                                          │
│  6. Re-validate spec quality checklist                                      │
│  7. Post-Execution Hooks (after_clarify)                                    │
│                                                                             │
│ OUTPUT: Updated spec.md with clarifications                                 │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: PLANNING (/speckit-plan)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Pre-Execution Hooks (before_plan)                                       │
│  2. Run setup-plan.ps1 (get paths, copy plan-template.md)                   │
│  3. Load spec.md and constitution.md                                        │
│  4. Phase 0: Research (resolve NEEDS CLARIFICATION)                         │
│     └─ Generate research.md with technical decisions                        │
│  5. Phase 1: Design & Contracts                                             │
│     ├─ Generate data-model.md (entities, relationships)                     │
│     ├─ Generate contracts/ (interface specifications)                       │
│     ├─ Generate quickstart.md (validation scenarios)                        │
│     └─ Update agent context (AGENTS.md)                                     │
│  6. Re-evaluate Constitution Check post-design                              │
│  7. Post-Execution Hooks (after_plan)                                       │
│     └─ Agent context update (speckit.agent-context.update)                  │
│                                                                             │
│ OUTPUT: plan.md, research.md, data-model.md, contracts/, quickstart.md      │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (User Review Gate)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: TASK GENERATION (/speckit-tasks)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Pre-Execution Hooks (before_tasks)                                      │
│  2. Run setup-tasks.ps1 (get paths, resolve tasks-template.md)              │
│  3. Load design documents (plan.md, spec.md, data-model.md, contracts/)     │
│  4. Organize tasks by user story (P1, P2, P3...)                            │
│  5. Generate dependency-ordered task list                                   │
│     ├─ Phase 1: Setup (shared infrastructure)                               │
│     ├─ Phase 2: Foundational (blocking prerequisites)                       │
│     ├─ Phase 3+: User Stories (in priority order)                           │
│     └─ Final Phase: Polish & cross-cutting concerns                         │
│  6. Mark parallelizable tasks with [P]                                      │
│  7. Post-Execution Hooks (after_tasks)                                      │
│                                                                             │
│ OUTPUT: tasks.md with checklist format: - [ ] T### [P?] [US?] Description   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: ANALYSIS (/speckit-analyze) [OPTIONAL]                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Pre-Execution Hooks (before_analyze)                                    │
│  2. Load spec.md, plan.md, tasks.md (read-only)                             │
│  3. Build semantic models (requirements, tasks, constitution)               │
│  4. Detection passes:                                                       │
│     ├─ Duplication detection                                                │
│     ├─ Ambiguity detection                                                  │
│     ├─ Underspecification                                                   │
│     ├─ Constitution alignment                                               │
│     ├─ Coverage gaps                                                        │
│     └─ Inconsistency                                                        │
│  5. Severity assignment (CRITICAL, HIGH, MEDIUM, LOW)                       │
│  6. Generate analysis report (no file modifications)                        │
│  7. Offer remediation suggestions (user must approve)                       │
│  8. Post-Execution Hooks (after_analyze)                                    │
│                                                                             │
│ OUTPUT: Analysis report with findings and recommendations                   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: IMPLEMENTATION (/speckit-implement)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Pre-Execution Hooks (before_implement)                                  │
│  2. Run check-prerequisites.ps1 (validate tasks.md exists)                  │
│  3. Check checklist status (if checklists/ exists)                          │
│  4. Load implementation context (tasks.md, plan.md, design docs)            │
│  5. Project Setup Verification (create/verify ignore files)                 │
│  6. Execute tasks phase-by-phase:                                           │
│     ├─ Phase 1: Setup (initialize project structure)                        │
│     ├─ Phase 2: Foundational (blocking prerequisites)                       │
│     ├─ Phase 3+: User Stories (tests → models → services → endpoints)       │
│     └─ Final Phase: Polish & validation                                     │
│  7. Mark completed tasks as [X] in tasks.md                                 │
│  8. Post-Execution Hooks (after_implement)                                  │
│                                                                             │
│ OUTPUT: Implemented code with all tasks marked complete                     │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUXILIARY COMMANDS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ /speckit-checklist: Generate custom checklists for requirements quality     │
│   - Creates checklists/[domain].md with CHK### items                        │
│   - Tests requirements quality (not implementation)                         │
│   - Categories: Completeness, Clarity, Consistency, Coverage, etc.          │
│                                                                             │
│ /speckit-constitution: Create/update project constitution                   │
│   - Manages .specify/memory/constitution.md                                 │
│   - Propagates changes to dependent templates                               │
│   - Version tracking with semantic versioning                               │
│                                                                             │
│ /speckit-taskstoissues: Convert tasks to GitHub issues                      │
│   - Reads tasks.md and creates GitHub issues via MCP                        │
│   - Only works with GitHub remotes                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SUPPORTING INFRASTRUCTURE                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PowerShell Scripts (.specify/scripts/powershell/):                          │
│   ├─ check-prerequisites.ps1: Validate feature directory and documents      │
│   ├─ setup-plan.ps1: Copy plan template and return paths                    │
│   ├─ setup-tasks.ps1: Resolve tasks template and return paths               │
│   ├─ common.ps1: Shared functions (Get-FeaturePathsEnv, Test-FeatureBranch) │
│   └─ create-new-feature.ps1: Create new feature directory                   │
│                                                                             │
│ Templates (.specify/templates/):                                            │
│   ├─ spec-template.md: Feature specification structure                      │
│   ├─ plan-template.md: Implementation plan structure                        │
│   ├─ tasks-template.md: Task list structure with user story phases          │
│   ├─ constitution-template.md: Project constitution template                │
│   └─ checklist-template.md: Checklist structure with CHK### items           │
│                                                                             │
│ Extensions (.specify/extensions/):                                          │
│   ├─ agent-context/: Manages coding agent context files                     │
│   │   ├─ extension.yml: Extension metadata and hook definitions             │
│   │   ├─ agent-context-config.yml: Context file and marker configuration    │
│   │   └─ scripts/: Bash and PowerShell scripts for context updates          │
│   └─ (Other extensions can be added)                                        │
│                                                                             │
│ Configuration (.specify/):                                                  │
│   ├─ extensions.yml: Installed extensions and hook configuration            │
│   ├─ feature.json: Active feature directory tracking                        │
│   ├─ init-options.json: Project initialization options                      │
│   └─ memory/constitution.md: Project governance principles                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ HOOK SYSTEM                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Hook Points:                                                                │
│   ├─ before_specify / after_specify                                         │
│   ├─ before_clarify / after_clarify                                         │
│   ├─ before_plan / after_plan                                               │
│   ├─ before_tasks / after_tasks                                             │
│   ├─ before_implement / after_implement                                     │
│   ├─ before_analyze / after_analyze                                         │
│   ├─ before_checklist / after_checklist                                     │
│   └─ before_constitution / after_constitution                               │
│                                                                             │
│ Hook Properties:                                                            │
│   ├─ extension: Extension providing the hook                                │
│   ├─ command: Command to execute (e.g., speckit.agent-context.update)       │
│   ├─ enabled: true/false (default: true)                                    │
│   ├─ optional: true/false (mandatory hooks auto-execute)                    │
│   ├─ prompt: User prompt for optional hooks                                 │
│   └─ condition: Conditional execution (evaluated by HookExecutor)           │
│                                                                             │
│ Hook Execution:                                                             │
│   1. Check .specify/extensions.yml exists                                   │
│   2. Filter hooks by enabled status                                         │
│   3. Evaluate conditions (if specified)                                     │
│   4. For mandatory hooks: emit EXECUTE_COMMAND                              │
│   5. For optional hooks: present to user with prompt                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW ORCHESTRATION (.specify/workflows/speckit/workflow.yml)            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Full SDD Cycle:                                                             │
│   1. speckit.specify → Review Gate (approve/reject)                         │
│   2. speckit.plan → Review Gate (approve/reject)                            │
│   3. speckit.tasks                                                          │
│   4. speckit.implement                                                      │
│                                                                             │
│ Supports multiple integrations: claude, copilot, gemini, opencode           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

---

# Spec Kit (Speckit) Deep Wiki

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Skills Reference](#core-skills-reference)
3. [PowerShell Scripts Reference](#powershell-scripts-reference)
4. [Templates Reference](#templates-reference)
5. [Extension System](#extension-system)
6. [Hook System](#hook-system)
7. [State Management](#state-management)
8. [Data Flow](#data-flow)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

Spec Kit (Speckit) is a specification-driven development framework that enforces a structured workflow for building software features. The system is built around AI-assisted commands (skills) that guide developers through specification, planning, task generation, and implementation phases.

### Key Design Principles

1. **Separation of Concerns**: Business requirements (spec.md) are separated from technical implementation (plan.md)
2. **Quality Gates**: Constitution compliance and validation checks at each phase
3. **Incremental Delivery**: User stories organized by priority with independent testability
4. **Extensibility**: Hook system for custom automation and integrations
5. **Layered Architecture**: Enforces clean separation between policy/domain code and external adapters

### Directory Structure

```
.specify/
├── agents/skills/           # AI skill definitions (.agents/skills/)
│   ├── speckit-specify/
│   ├── speckit-plan/
│   ├── speckit-tasks/
│   ├── speckit-implement/
│   ├── speckit-analyze/
│   ├── speckit-clarify/
│   ├── speckit-checklist/
│   ├── speckit-constitution/
│   ├── speckit-agent-context-update/
│   └── speckit-taskstoissues/
├── extensions/              # Extension packages
│   └── agent-context/
│       ├── extension.yml
│       ├── agent-context-config.yml
│       ├── commands/
│       └── scripts/
│           ├── bash/
│           └── powershell/
├── scripts/                # PowerShell utility scripts
│   └── powershell/
│       ├── common.ps1
│       ├── check-prerequisites.ps1
│       ├── setup-plan.ps1
│       ├── setup-tasks.ps1
│       └── create-new-feature.ps1
├── templates/              # Document templates
│   ├── spec-template.md
│   ├── plan-template.md
│   ├── tasks-template.md
│   ├── constitution-template.md
│   └── checklist-template.md
├── workflows/              # Workflow orchestration
│   └── speckit/
│       └── workflow.yml
├── memory/                 # Persistent state
│   └── constitution.md
├── extensions.yml          # Extension configuration
├── feature.json            # Active feature tracking
├── init-options.json       # Initialization options
├── integration.json        # Integration configuration
└── feature.json            # Active feature directory

specs/                      # Feature specifications
└── ###-feature-name/
    ├── spec.md            # Feature specification
    ├── plan.md            # Implementation plan
    ├── research.md        # Technical research
    ├── data-model.md      # Data model design
    ├── quickstart.md      # Validation scenarios
    ├── contracts/         # Interface contracts
    ├── tasks.md           # Task list
    └── checklists/        # Quality checklists
        └── requirements.md
```

---

## Core Skills Reference

### speckit-specify

**Purpose**: Create or update feature specification from natural language description

**Input**: Feature description (natural language)

**Output**: `specs/###-feature-name/spec.md` + `checklists/requirements.md`

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_specify` hooks in extensions.yml
   - Git extension can create/switch branches
   - Mandatory hooks auto-execute, optional hooks prompt user

2. **Feature Directory Creation**:
   - Generate short name (2-4 words) from feature description
   - Determine directory naming scheme (sequential or timestamp)
   - Create `specs/###-feature-name/` directory
   - Copy resolved spec-template.md to `spec.md`
   - Persist feature directory to `.specify/feature.json`

3. **Specification Generation**:
   - Parse user description for actors, actions, data, constraints
   - Generate user stories with priorities (P1, P2, P3...)
   - Create functional requirements (FR-### format)
   - Define success criteria (SC-### format, measurable outcomes)
   - Identify key entities if data involved
   - Document assumptions

4. **Quality Validation**:
   - Create `checklists/requirements.md` with validation items
   - Check for implementation details leak (should be none)
   - Verify requirements are testable and unambiguous
   - Ensure success criteria are technology-agnostic
   - Limit [NEEDS CLARIFICATION] markers to max 3
   - If clarifications needed, present options to user

5. **Post-Execution Hooks**: Check `after_specify` hooks
   - Agent context update (speckit.agent-context.update)

**Key Rules**:
- Focus on WHAT and WHY, not HOW
- No implementation details (languages, frameworks, APIs)
- Written for business stakeholders, not developers
- Maximum 3 [NEEDS CLARIFICATION] markers
- Success criteria must be measurable and technology-agnostic

**Quality Checklist Items**:
- No implementation details in spec
- Focused on user value and business needs
- All mandatory sections completed
- No [NEEDS CLARIFICATION] markers remain
- Requirements are testable and unambiguous
- Success criteria are measurable
- Edge cases identified
- Scope clearly bounded

---

### speckit-clarify

**Purpose**: Identify underspecified areas in spec and resolve through targeted questions

**Input**: None (uses current spec.md)

**Output**: Updated `spec.md` with clarifications integrated

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_clarify` hooks

2. **Load Context**:
   - Run `check-prerequisites.ps1 -PathsOnly` to get feature paths
   - Load `spec.md` and `constitution.md` (if exists)

3. **Ambiguity Scan** (10 categories):
   - Functional Scope & Behavior
   - Domain & Data Model
   - Interaction & UX Flow
   - Non-Functional Quality Attributes
   - Integration & External Dependencies
   - Edge Cases & Failure Handling
   - Constraints & Tradeoffs
   - Terminology & Consistency
   - Completion Signals
   - Misc / Placeholders

4. **Question Generation**:
   - Maximum 5 questions total
   - Each question must be multiple-choice (2-5 options) or short-answer (≤5 words)
   - Prioritize by (Impact × Uncertainty) heuristic
   - Balance category coverage
   - Present one question at a time

5. **Interactive Questioning**:
   - Present recommended option with reasoning
   - Show options in markdown table
   - Wait for user response
   - Accept "yes"/"recommended" to use suggestion
   - Validate answer format

6. **Integration After Each Answer**:
   - Create `## Clarifications` section if missing
   - Add session subheading (### Session YYYY-MM-DD)
   - Append Q&A bullet
   - Update relevant spec section immediately
   - Save spec file after each integration

7. **Validation**:
   - Verify no contradictory text remains
   - Check terminology consistency
   - Validate markdown structure

8. **Re-validate Checklist**:
   - If `checklists/requirements.md` exists
   - Re-evaluate each checkbox against updated spec
   - Toggle [ ]/[x] markers only for changed items
   - Report before/after pass counts

9. **Post-Execution Hooks**: Check `after_clarify` hooks

**Key Rules**:
- Maximum 5 questions per session
- Questions must materially impact architecture, data modeling, or validation
- Sequential questioning (one at a time)
- Incremental spec updates (save after each answer)
- Respect user early termination signals

---

### speckit-plan

**Purpose**: Execute implementation planning workflow to generate design artifacts

**Input**: Feature description (or uses existing spec.md)

**Output**: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_plan` hooks

2. **Setup**:
   - Run `setup-plan.ps1 -Json` to get paths
   - Copy plan-template.md to `plan.md` if not exists
   - Load `spec.md` and `constitution.md`

3. **Phase 0: Research**:
   - Extract NEEDS CLARIFICATION from Technical Context
   - Generate research tasks for unknowns
   - Consolidate findings in `research.md`
   - Format: Decision, Rationale, Alternatives considered

4. **Phase 1: Design & Contracts**:
   - Extract entities from spec → `data-model.md`
     - Entity name, fields, relationships
     - Validation rules from requirements
     - State transitions if applicable
   - Define interface contracts → `contracts/`
     - Identify project interfaces (APIs, CLI, UI, etc.)
     - Document appropriate contract format
     - Skip if project is purely internal
   - Create validation guide → `quickstart.md`
     - Runnable validation scenarios
     - Prerequisites, setup commands, test commands
     - Expected outcomes
     - No implementation code
   - Update agent context (AGENTS.md)
     - Update plan reference between SPECKIT markers

5. **Constitution Check**:
   - Evaluate gates in plan.md
   - ERROR if violations unjustified
   - Re-evaluate post-design

6. **Post-Execution Hooks**: Check `after_plan` hooks
   - Agent context update (speckit.agent-context.update)

**Key Rules**:
- Use absolute paths for filesystem operations
- Use project-relative paths for documentation references
- ERROR on gate failures or unresolved clarifications
- Constitution is non-negotiable

**Phases**:
- **Phase 0**: Resolve all NEEDS CLARIFICATION via research
- **Phase 1**: Generate design artifacts (data model, contracts, quickstart)
- **Phase 2**: (Reserved for future use)

---

### speckit-tasks

**Purpose**: Generate actionable, dependency-ordered task list from design artifacts

**Input**: None (uses existing design documents)

**Output**: `tasks.md` with checklist format

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_tasks` hooks

2. **Setup**:
   - Run `setup-tasks.ps1 -Json` to get paths
   - Resolve tasks-template.md through override stack
   - Load design documents from FEATURE_DIR

3. **Load Design Documents**:
   - **Required**: plan.md, spec.md
   - **Optional**: data-model.md, contracts/, research.md, quickstart.md
   - **Optional**: constitution.md

4. **Execute Task Generation**:
   - Extract tech stack, libraries, project structure from plan.md
   - Extract user stories with priorities from spec.md
   - Map entities to user stories (if data-model.md exists)
   - Map contracts to user stories (if contracts/ exists)
   - Extract decisions for setup tasks (if research.md exists)
   - Generate tasks organized by user story
   - Generate dependency graph
   - Create parallel execution examples
   - Validate task completeness

5. **Generate tasks.md**:
   - Use tasks-template.md as structure
   - Fill with correct feature name
   - **Phase 1**: Setup tasks (project initialization)
   - **Phase 2**: Foundational tasks (blocking prerequisites)
   - **Phase 3+**: User stories in priority order (P1, P2, P3...)
   - **Final Phase**: Polish & cross-cutting concerns
   - Each phase includes: story goal, independent test criteria, tests, implementation tasks
   - All tasks follow strict checklist format

6. **Post-Execution Hooks**: Check `after_tasks` hooks

**Task Format (REQUIRED)**:
```markdown
- [ ] T### [P?] [US?] Description with file path
```

**Format Components**:
- **Checkbox**: Always start with `- [ ]`
- **Task ID**: Sequential number (T001, T002, T003...)
- **[P] marker**: Include ONLY if parallelizable (different files, no dependencies)
- **[Story] label**: REQUIRED for user story phase tasks (US1, US2, US3...)
- **Description**: Clear action with exact file path

**Task Organization**:
- **Setup phase**: NO story label
- **Foundational phase**: NO story label
- **User Story phases**: MUST have story label
- **Polish phase**: NO story label

**Phase Structure**:
- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
- **Final Phase**: Polish & Cross-Cutting Concerns

**Key Rules**:
- Tasks MUST be organized by user story
- Tests are OPTIONAL (only if requested)
- Every task must have exact file path
- Mark parallelizable tasks with [P]
- Each user story should be independently testable

---

### speckit-implement

**Purpose**: Execute implementation plan by processing all tasks in tasks.md

**Input**: None (uses existing tasks.md)

**Output**: Implemented code with all tasks marked [X]

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_implement` hooks

2. **Prerequisites Check**:
   - Run `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`
   - Validate tasks.md exists

3. **Checklist Status Check**:
   - Scan all checklist files in checklists/ directory
   - Count total, completed, and incomplete items
   - Create status table
   - If any checklist incomplete: prompt user to proceed or stop
   - If all complete: automatically proceed

4. **Load Implementation Context**:
   - **Required**: tasks.md, plan.md
   - **Optional**: data-model.md, contracts/, research.md, constitution.md, quickstart.md

5. **Project Setup Verification**:
   - Detect project type (git, Docker, ESLint, etc.)
   - Create/verify ignore files (.gitignore, .dockerignore, etc.)
   - Append missing critical patterns only
   - Use technology-specific patterns from plan.md

6. **Parse tasks.md**:
   - Extract task phases (Setup, Tests, Core, Integration, Polish)
   - Extract task dependencies (sequential vs parallel)
   - Extract task details (ID, description, file paths, [P] markers)
   - Extract execution flow

7. **Execute Implementation**:
   - **Phase-by-phase execution**: Complete each phase before moving to next
   - **Respect dependencies**: Sequential tasks in order, parallel [P] tasks together
   - **Follow TDD**: Test tasks before implementation tasks
   - **File-based coordination**: Tasks affecting same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion

8. **Implementation Rules**:
   - Setup first (project structure, dependencies, configuration)
   - Tests before code (if writing tests)
   - Core development (models, services, endpoints)
   - Integration work (database, middleware, logging)
   - Polish and validation (unit tests, performance, documentation)

9. **Progress Tracking**:
   - Report progress after each completed task
   - Halt if non-parallel task fails
   - Continue with successful parallel tasks, report failed ones
   - Mark completed tasks as [X] in tasks.md

10. **Completion Validation**:
    - Verify all required tasks completed
    - Check implementation matches specification
    - Validate tests pass and coverage meets requirements
    - Confirm implementation follows technical plan

11. **Post-Execution Hooks**: Check `after_implement` hooks

**Key Rules**:
- Phase-by-phase execution
- Respect task dependencies
- Mark completed tasks as [X]
- Halt on non-parallel task failures
- Verify ignore files for detected technologies

**Ignore File Detection**:
- Git repo → .gitignore
- Dockerfile → .dockerignore
- ESLint config → .eslintignore
- Prettier config → .prettierignore
- npm/Node.js → .npmignore
- Terraform → .terraformignore
- Helm charts → .helmignore

---

### speckit-analyze

**Purpose**: Perform non-destructive cross-artifact consistency and quality analysis

**Input**: None (uses existing spec.md, plan.md, tasks.md)

**Output**: Analysis report (no file modifications)

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_analyze` hooks

2. **Initialize Analysis Context**:
   - Run `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`
   - Parse FEATURE_DIR and AVAILABLE_DOCS
   - Derive absolute paths for SPEC, PLAN, TASKS
   - Abort if any required file missing

3. **Load Artifacts (Progressive Disclosure)**:
   - **From spec.md**: Overview, Functional Requirements, Success Criteria, User Stories, Edge Cases
   - **From plan.md**: Architecture/stack choices, Data Model references, Phases, Technical constraints
   - **From tasks.md**: Task IDs, Descriptions, Phase grouping, [P] markers, Referenced file paths
   - **From constitution**: Principle names and MUST/SHOULD statements

4. **Build Semantic Models**:
   - **Requirements inventory**: FR-### and SC-### keys with imperative slugs
   - **User story/action inventory**: Discrete user actions with acceptance criteria
   - **Task coverage mapping**: Map each task to requirements/stories
   - **Constitution rule set**: Extract principle names and normative statements

5. **Detection Passes** (limit to 50 findings total):
   - **A. Duplication Detection**: Near-duplicate requirements
   - **B. Ambiguity Detection**: Vague adjectives, unresolved placeholders
   - **C. Underspecification**: Requirements missing object/outcome, tasks referencing undefined components
   - **D. Constitution Alignment**: Conflicts with MUST principles, missing mandated sections
   - **E. Coverage Gaps**: Requirements with zero tasks, unmapped tasks, missing success criteria coverage
   - **F. Inconsistency**: Terminology drift, data entity mismatches, task ordering contradictions, conflicting requirements

6. **Severity Assignment**:
   - **CRITICAL**: Violates constitution MUST, missing core artifact, requirement with zero coverage blocking baseline
   - **HIGH**: Duplicate/conflicting requirement, ambiguous security/performance, untestable acceptance criterion
   - **MEDIUM**: Terminology drift, missing non-functional task coverage, underspecified edge case
   - **LOW**: Style/wording improvements, minor redundancy

7. **Produce Analysis Report**:
   - Markdown table with columns: ID, Category, Severity, Location(s), Summary, Recommendation
   - Coverage Summary Table: Requirement Key, Has Task?, Task IDs, Notes
   - Constitution Alignment Issues (if any)
   - Unmapped Tasks (if any)
   - Metrics: Total Requirements, Total Tasks, Coverage %, Ambiguity Count, Duplication Count, Critical Issues Count

8. **Provide Next Actions**:
   - If CRITICAL: Recommend resolving before /speckit-implement
   - If only LOW/MEDIUM: User may proceed with improvement suggestions
   - Provide explicit command suggestions

9. **Offer Remediation**:
   - Ask: "Would you like me to suggest concrete remediation edits for the top N issues?"
   - Do NOT apply automatically (user must approve)

10. **Post-Execution Hooks**: Check `after_analyze` hooks

**Operating Constraints**:
- **STRICTLY READ-ONLY**: Do not modify any files
- **Constitution Authority**: Constitution is non-negotiable
- **Token Efficiency**: Limit findings to 50, summarize overflow
- **Progressive Disclosure**: Load artifacts incrementally

**Key Rules**:
- NEVER modify files (read-only analysis)
- NEVER hallucinate missing sections
- Prioritize constitution violations (always CRITICAL)
- Use examples over exhaustive rules
- Report zero issues gracefully

---

### speckit-checklist

**Purpose**: Generate custom checklists for requirements quality validation

**Input**: Checklist type/domain description

**Output**: `checklists/[domain].md` with CHK### items

**Core Concept**: Checklists are **UNIT TESTS FOR ENGLISH** - they validate the quality, clarity, and completeness of requirements, NOT the implementation.

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_checklist` hooks

2. **Setup**:
   - Run `check-prerequisites.ps1 -Json` to get FEATURE_DIR
   - Load constitution.md (if exists)

3. **Clarify Intent (Dynamic)**:
   - Generate up to 3 initial contextual clarifying questions
   - Extract signals: domain keywords, risk indicators, stakeholder hints, deliverables
   - Cluster signals into candidate focus areas (max 4)
   - Identify audience & timing (author, reviewer, QA, release)
   - Detect missing dimensions: scope, depth, risk emphasis, boundaries, acceptance criteria
   - Formulate questions from archetypes: scope refinement, risk prioritization, depth calibration, audience framing, boundary exclusion, scenario class gap
   - Limit to A-E options maximum
   - If ≥2 scenario classes unclear, ask up to 2 follow-ups (Q4/Q5)

4. **Understand User Request**:
   - Combine user input + clarifying answers
   - Derive checklist theme (security, review, deploy, ux)
   - Consolidate explicit must-have items
   - Map focus selections to category scaffolding
   - Infer missing context from spec/plan/tasks

5. **Load Feature Context**:
   - Load spec.md, plan.md, tasks.md from FEATURE_DIR
   - Use progressive disclosure (load only necessary portions)
   - Prefer summarizing long sections

6. **Generate Checklist**:
   - Create `checklists/` directory if doesn't exist
   - Generate unique filename: `[domain].md`
   - If file exists: append to existing, continue from last CHK ID
   - If file doesn't exist: create new, start at CHK001
   - Never delete or replace existing content

7. **Checklist Content (Unit Tests for Requirements)**:
   Every item MUST evaluate requirements for:
   - **Completeness**: Are all necessary requirements present?
   - **Clarity**: Are requirements unambiguous and specific?
   - **Consistency**: Do requirements align with each other?
   - **Measurability**: Can requirements be objectively verified?
   - **Coverage**: Are all scenarios/edge cases addressed?

8. **Category Structure**:
   - Requirement Completeness
   - Requirement Clarity
   - Requirement Consistency
   - Acceptance Criteria Quality
   - Scenario Coverage
   - Edge Case Coverage
   - Non-Functional Requirements
   - Dependencies & Assumptions
   - Ambiguities & Conflicts

9. **Item Structure**:
   - Question format asking about requirement quality
   - Focus on what's WRITTEN (or not written) in spec/plan
   - Include quality dimension in brackets [Completeness/Clarity/etc.]
   - Reference spec section `[Spec §X.Y]` when checking existing requirements
   - Use `[Gap]` marker when checking for missing requirements

10. **Traceability Requirements**:
    - Minimum 80% of items must include traceability reference
    - Reference spec section `[Spec §X.Y]` or use markers: `[Gap]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`

11. **Content Consolidation**:
    - Soft cap: If >40 items, prioritize by risk/impact
    - Merge near-duplicates
    - If >5 low-impact edge cases, create one consolidated item

12. **Post-Execution Hooks**: Check `after_checklist` hooks

**ABSOLUTELY PROHIBITED** (these make it an implementation test):
- ❌ Items starting with "Verify", "Test", "Confirm", "Check" + implementation behavior
- ❌ References to code execution, user actions, system behavior
- ❌ "Displays correctly", "works properly", "functions as expected"
- ❌ "Click", "navigate", "render", "load", "execute"
- ❌ Test cases, test plans, QA procedures
- ❌ Implementation details (frameworks, APIs, algorithms)

**REQUIRED PATTERNS** (these test requirements quality):
- ✅ "Are [requirement type] defined/specified/documented for [scenario]?"
- ✅ "Is [vague term] quantified/clarified with specific criteria?"
- ✅ "Are requirements consistent between [section A] and [section B]?"
- ✅ "Can [requirement] be objectively measured/verified?"
- ✅ "Are [edge cases/scenarios] addressed in requirements?"
- ✅ "Does the spec define [missing aspect]?"

**Example Checklist Types**:
- **ux.md**: Visual hierarchy, interaction states, accessibility requirements
- **api.md**: Error response formats, rate limiting, authentication consistency
- **performance.md**: Performance metrics, target coverage, degradation requirements
- **security.md**: Authentication requirements, data protection, threat model alignment

---

### speckit-constitution

**Purpose**: Create or update project constitution with principle governance

**Input**: Principle inputs (interactive or provided)

**Output**: Updated `.specify/memory/constitution.md`

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_constitution` hooks

2. **Load Existing Constitution**:
   - Load `.specify/memory/constitution.md`
   - Identify placeholder tokens: `[ALL_CAPS_IDENTIFIER]`
   - Note: User may require less/more principles than template

3. **Collect/Derive Values**:
   - Use user input if supplied
   - Otherwise infer from repo context (README, docs, prior versions)
   - Governance dates:
     - `RATIFICATION_DATE`: Original adoption date (ask if unknown)
     - `LAST_AMENDED_DATE`: Today if changes made, otherwise keep previous
   - `CONSTITUTION_VERSION`: Increment according to semantic versioning
     - MAJOR: Backward incompatible governance/principle removals
     - MINOR: New principle/section added or materially expanded
     - PATCH: Clarifications, wording, typo fixes

4. **Draft Updated Constitution**:
   - Replace every placeholder with concrete text
   - Preserve heading hierarchy
   - Remove comments once replaced (unless still add guidance)
   - Ensure each Principle section:
     - Succinct name line
     - Paragraph or bullet list capturing non-negotiable rules
     - Explicit rationale if not obvious
   - Ensure Governance section lists:
     - Amendment procedure
     - Versioning policy
     - Compliance review expectations

5. **Consistency Propagation Checklist**:
   - Read `.specify/templates/plan-template.md`: Ensure Constitution Check aligns
   - Read `.specify/templates/spec-template.md`: Update if constitution adds/removes mandatory sections
   - Read `.specify/templates/tasks-template.md`: Ensure task categorization reflects principles
   - Read command files in `.specify/templates/commands/*.md`: Verify no outdated references
   - Read runtime guidance docs (README.md, docs/quickstart.md): Update references

6. **Produce Sync Impact Report**:
   - Prepend as HTML comment at top of constitution
   - Include: Version change, modified principles, added/removed sections, templates requiring updates, follow-up TODOs

7. **Validation**:
   - No remaining unexplained bracket tokens
   - Version line matches report
   - Dates in ISO format (YYYY-MM-DD)
   - Principles are declarative, testable, free of vague language

8. **Write Constitution**:
   - Overwrite `.specify/memory/constitution.md`

9. **Output Summary**:
   - New version and bump rationale
   - Files flagged for manual follow-up
   - Suggested commit message

**Key Rules**:
- Always operate on existing `.specify/memory/constitution.md`
- Use semantic versioning for constitution version
- Propagate changes to all dependent templates
- Produce sync impact report
- Validate no placeholder tokens remain

**Formatting Requirements**:
- Use Markdown headings exactly as in template
- Wrap long lines to <100 chars
- Single blank line between sections
- No trailing whitespace

---

### speckit-agent-context-update

**Purpose**: Refresh managed Spec Kit section in coding agent context file

**Input**: Plan path (optional, auto-detects if omitted)

**Output**: Updated agent context file (e.g., AGENTS.md, CLAUDE.md)

**Execution Flow**:

1. **Load Configuration**:
   - Read `.specify/extensions/agent-context/agent-context-config.yml`
   - Get `context_file`: Path to agent context file
   - Get `context_markers.start` / `.end`: Delimiters (default: `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->`)

2. **Determine Plan Path**:
   - If plan_path provided: use it
   - If omitted: auto-detect most recently modified `specs/*/plan.md`

3. **Update Context File**:
   - Read context file
   - Locate managed section between markers
   - Create, replace, or append managed block
   - Set section to point at plan path

4. **Handle Edge Cases**:
   - If context_file empty or cannot be located: report nothing to do, exit successfully
   - If markers not found: create them

**Script Execution**:
- **Bash**: `.specify/extensions/agent-context/scripts/bash/update-agent-context.sh [plan_path]`
- **PowerShell**: `.specify/extensions/agent-context/scripts/powershell/update-agent-context.ps1 [plan_path]`

**Key Rules**:
- Auto-detect plan path if not provided
- Create markers if not found
- Report nothing to do if context file missing (not an error)

---

### speckit-taskstoissues

**Purpose**: Convert tasks to GitHub issues

**Input**: None (uses existing tasks.md)

**Output**: GitHub issues created via MCP

**Execution Flow**:

1. **Pre-Execution Hooks**: Check `before_taskstoissues` hooks

2. **Setup**:
   - Run `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`
   - Parse FEATURE_DIR and AVAILABLE_DOCS
   - Extract tasks path

3. **Get Git Remote**:
   - Run `git config --get remote.origin.url`
   - **CAUTION**: ONLY PROCEED IF REMOTE IS GITHUB URL

4. **Create Issues**:
   - For each task in tasks.md
   - Use GitHub MCP server to create issue
   - **CAUTION**: NEVER CREATE ISSUES IN REPOSITORIES THAT DON'T MATCH REMOTE URL

5. **Post-Execution Hooks**: Check `after_taskstoissues` hooks

**Key Rules**:
- Only works with GitHub remotes
- Never create issues in wrong repository
- Requires GitHub MCP server

---

## PowerShell Scripts Reference

### common.ps1

**Purpose**: Shared utility functions for all PowerShell scripts

**Location**: `.specify/scripts/powershell/common.ps1`

**Key Functions**:

- `Get-FeaturePathsEnv`: Get all feature-related paths and environment variables
  - Returns: REPO_ROOT, CURRENT_BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS, RESEARCH, DATA_MODEL, CONTRACTS_DIR, QUICKSTART, HAS_GIT
  - Reads `.specify/feature.json` for pinned feature directory
  - Determines branch naming convention from `.specify/init-options.json`

- `Test-FeatureBranch`: Validate branch name follows convention
  - Parameters: Branch, HasGit
  - Checks for pattern: `###-feature-name` or `timestamp-feature-name`
  - Returns true/false

- `Test-FeatureJsonMatchesFeatureDir`: Validate feature.json matches active directory
  - Parameters: RepoRoot, ActiveFeatureDir
  - Returns true/false

- `Resolve-Template`: Resolve template through override stack
  - Parameters: TemplateName, RepoRoot
  - Resolution order: overrides → presets → extensions → core
  - Returns absolute path to resolved template

- `Test-FileExists`: Test if file exists and report status
  - Parameters: Path, Description
  - Outputs status message

- `Test-DirHasFiles`: Test if directory has files and report status
  - Parameters: Path, Description
  - Outputs status message

**Environment Variables Used**:
- `SPECIFY_FEATURE_DIRECTORY`: Explicit feature directory override
- `GIT_BRANCH_NAME`: Explicit git branch name override

---

### check-prerequisites.ps1

**Purpose**: Unified prerequisite checking for SDD workflow

**Location**: `.specify/scripts/powershell/check-prerequisites.ps1`

**Usage**:
```powershell
./check-prerequisites.ps1 [OPTIONS]
```

**Options**:
- `-Json`: Output in JSON format
- `-RequireTasks`: Require tasks.md to exist (for implementation phase)
- `-IncludeTasks`: Include tasks.md in AVAILABLE_DOCS list
- `-PathsOnly`: Only output path variables (no validation)
- `-Help`, `-h`: Show help message

**Execution Flow**:

1. **Source common.ps1**: Load shared functions

2. **Get Feature Paths**: Call `Get-FeaturePathsEnv`

3. **Paths-Only Mode**: If `-PathsOnly` flag set
   - Output paths in JSON or text format
   - Exit immediately (no validation)

4. **Validate Branch Name**: Call `Test-FeatureBranch`

5. **Validate Required Directories**:
   - Check FEATURE_DIR exists
   - Check IMPL_PLAN (plan.md) exists
   - If `-RequireTasks`: Check TASKS (tasks.md) exists

6. **Build Available Docs List**:
   - Check for research.md
   - Check for data-model.md
   - Check for contracts/ directory with files
   - Check for quickstart.md
   - If `-IncludeTasks`: Check for tasks.md

7. **Output Results**:
   - JSON: FEATURE_DIR, AVAILABLE_DOCS array
   - Text: FEATURE_DIR and status of each potential document

**Error Handling**:
- Exits with code 1 if validation fails
- Provides helpful error messages with command suggestions

**Examples**:
```powershell
# Check task prerequisites (plan.md required)
.\check-prerequisites.ps1 -Json

# Check implementation prerequisites (plan.md + tasks.md required)
.\check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks

# Get feature paths only (no validation)
.\check-prerequisites.ps1 -PathsOnly
```

---

### setup-plan.ps1

**Purpose**: Setup implementation plan for a feature

**Location**: `.specify/scripts/powershell/setup-plan.ps1`

**Usage**:
```powershell
./setup-plan.ps1 [-Json] [-Help]
```

**Options**:
- `-Json`: Output results in JSON format
- `-Help`: Show help message

**Execution Flow**:

1. **Load common.ps1**: Source shared functions

2. **Get Feature Paths**: Call `Get-FeaturePathsEnv`

3. **Validate Branch**:
   - If feature.json pins directory: skip branch validation
   - Otherwise: Call `Test-FeatureBranch`

4. **Ensure Feature Directory Exists**:
   - Create FEATURE_DIR if doesn't exist

5. **Copy Plan Template**:
   - Check if plan.md already exists
   - If exists: Skip template copy (warn user)
   - If doesn't exist:
     - Resolve plan-template.md through override stack
     - Read template content
     - Write to plan.md with UTF-8 encoding without BOM
     - If template not found: Create basic plan file

6. **Output Results**:
   - JSON: FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH, HAS_GIT
   - Text: Feature spec path, plan path, specs directory, branch, git status

**Error Handling**:
- Exits with code 1 if branch validation fails
- Warns if plan already exists

---

### setup-tasks.ps1

**Purpose**: Setup tasks generation for a feature

**Location**: `.specify/scripts/powershell/setup-tasks.ps1`

**Usage**:
```powershell
./setup-tasks.ps1 [-Json] [-Help]
```

**Options**:
- `-Json`: Output results in JSON format
- `-Help`: Show help message

**Execution Flow**:

1. **Load common.ps1**: Source shared functions

2. **Get Feature Paths**: Call `Get-FeaturePathsEnv`

3. **Validate Branch**:
   - If feature.json pins directory: skip branch validation
   - Otherwise: Call `Test-FeatureBranch`

4. **Validate Prerequisites**:
   - Check plan.md exists (error if missing)
   - Check spec.md exists (error if missing)

5. **Build Available Docs List**:
   - Check for research.md
   - Check for data-model.md
   - Check for contracts/ directory with files
   - Check for quickstart.md

6. **Resolve Tasks Template**:
   - Call `Resolve-Template` for 'tasks-template'
   - If not found: Error with detailed message about resolution order
   - Convert to absolute path

7. **Output Results**:
   - JSON: FEATURE_DIR, AVAILABLE_DOCS, TASKS_TEMPLATE
   - Text: Feature directory, tasks template path, status of each doc

**Error Handling**:
- Exits with code 1 if plan.md or spec.md missing
- Exits with code 1 if tasks-template.md not found (with detailed error message)

**Template Resolution Order**:
1. `.specify/templates/overrides/tasks-template.md`
2. Preset templates
3. Extension templates
4. Core: `.specify/templates/tasks-template.md`

---

### create-new-feature.ps1

**Purpose**: Create new feature directory structure

**Location**: `.specify/scripts/powershell/create-new-feature.ps1`

**Note**: This script was referenced but not fully explored in the analysis. It likely handles the initial creation of feature directories with proper naming conventions.

---

## Templates Reference

### spec-template.md

**Purpose**: Template for feature specification documents

**Location**: `.specify/templates/spec-template.md`

**Structure**:

```markdown
# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Brief Title] (Priority: P1)
[Describe this user journey in plain language]
**Why this priority**: [Explain the value]
**Independent Test**: [How to test independently]
**Acceptance Scenarios**:
1. Given [initial state], When [action], Then [expected outcome]

### User Story 2 - [Brief Title] (Priority: P2)
...

## Constitution Alignment *(mandatory)*

### Application Action and Boundary Impact
- Primary application action or use case
- Queue entry points
- Policy ownership
- App/adapters touched
- External details touched
- Model touch points

### Dependency and Exception Check
- Inward dependency preserved
- Documented architecture exception used
- Directive/test sync required
- Refactoring expected while implementing

### Edge Cases
- What happens when [boundary condition]?
- How does the system handle [error scenario]?
...

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
...

### Key Entities *(include if feature involves data)*
- **[Entity 1]**: [What it represents and why it matters]
...

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: [Measurable user or workflow outcome]
- **SC-002**: [Measurable behavior or correctness outcome]
...

## Assumptions
- [Assumption about target users]
- [Assumption about scope boundaries]
...
```

**Key Sections**:
- **User Scenarios & Testing**: User stories with priorities and acceptance criteria
- **Constitution Alignment**: Boundary impact, dependency check, edge cases
- **Functional Requirements**: FR-### format, MUST be specific
- **Success Criteria**: SC-### format, measurable outcomes
- **Assumptions**: Document assumptions about users, scope, existing code

---

### plan-template.md

**Purpose**: Template for implementation plan documents

**Location**: `.specify/templates/plan-template.md`

**Structure**:

```markdown
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Summary
[Extract from feature spec: primary requirement + technical approach]

## Technical Context
**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 19, Vite 6, Electron 41, tsyringe, zustand, zod, Vitest, ESLint
**Storage**: Local files plus renderer/main-process state
**Testing**: Vitest, Testing Library, linting, architecture/convention tests
**Target Platform**: Electron desktop application
**Project Type**: Layered desktop app with renderer-facing adapters, policy/domain code, external-system adapters
**Performance Goals**: Preserve responsive renderer interactions
**Constraints**: Respect established layer boundaries, inward dependency direction
**Scale/Scope**: Prefer focused feature slices

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
- [ ] Work is placed in the correct layer
- [ ] Source dependencies still point inward toward policy
- [ ] The primary application action or use case is explicit
- [ ] Controllers only orchestrate validations and operations
- [ ] Persisted or runtime-parsed data uses typed model definitions
- [ ] Any rule, exception, boundary, naming, or DI change includes matching updates
- [ ] The design reduces or at least does not add duplication

## Project Structure
### Documentation (this feature)
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md

### Source Code (repository root)
electron/
src/
├── app/
├── domain/
├── gateway/
└── model/
test/
└── architecture/

## Complexity Tracking
> **Fill ONLY if Constitution Check has violations that must be justified**
| Violation | Why Needed | Simpler Alternative Rejected Because |
```

**Key Sections**:
- **Technical Context**: Tech stack, dependencies, platform, constraints
- **Constitution Check**: Quality gate with 7 checklist items
- **Project Structure**: Documentation and source code layout
- **Complexity Tracking**: For justified constitution violations

---

### tasks-template.md

**Purpose**: Template for task list documents

**Location**: `.specify/templates/tasks-template.md`

**Structure**:

```markdown
# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: Include tests and enforcement updates required by constitution
**Organization**: Tasks grouped by user story

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)
- [ ] T001 Create or extend feature folders
- [ ] T002 Verify plan's constitution check
- [ ] T003 [P] Identify required directive, test, refactor updates

## Phase 2: Foundational (Blocking Prerequisites)
⚠️ CRITICAL: No user story work can begin until this phase is complete
- [ ] T004 Establish or update typed boundaries in src/model/**
- [ ] T005 [P] Establish or update focused policy units in src/domain/**
- [ ] T006 [P] Establish or update app-layer seams in src/app/**
- [ ] T007 [P] Establish or update gateway/Electron seams in src/gateway/** or electron/**
- [ ] T008 Add or update architecture/convention tests
- [ ] T009 Remove or reduce known duplication

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP
**Goal**: [Brief description]
**Independent Test**: [How to verify]

### Tests for User Story 1
- [ ] T010 [P] [US1] Add or update policy-layer tests
- [ ] T011 [P] [US1] Add or update adapter/integration tests
- [ ] T012 [P] [US1] Add or update architecture/convention coverage

### Implementation for User Story 1
- [ ] T013 [P] [US1] Implement app-layer translation changes
- [ ] T014 [P] [US1] Implement domain or policy changes
- [ ] T015 [P] [US1] Implement gateway/model/Electron changes
- [ ] T016 [US1] Connect end-to-end flow
- [ ] T017 [US1] Refine naming, cohesion, control flow

## Phase 4: User Story 2 - [Title] (Priority: P2)
...

## Phase N: Polish & Cross-Cutting Concerns
- [ ] TXXX [P] Update docs and quickstart guidance
- [ ] TXXX Run lint, relevant Vitest suites, and architecture/convention tests
- [ ] TXXX If directives changed, update matching directive artifacts
- [ ] TXXX Remove temporary scaffolding

## Dependencies & Execution Order
### Phase Dependencies
- Setup (Phase 1): No dependencies
- Foundational (Phase 2): Depends on Setup
- User Stories (Phase 3+): Depend on Foundational
- Polish (Final Phase): Depends on all desired user stories

### User Story Dependencies
- User Story 1 (P1): Starts after Foundational, delivers MVP
- User Story 2 (P2): Starts after Foundational, may integrate with US1
- User Story 3 (P3): Starts after Foundational, may integrate with earlier stories

### Within Each User Story
- Add or update policy tests before finalizing implementation
- Preserve queue-driven action flow
- Keep state writes and business logic inside policy-owned units
- Keep typed model and boundary translation responsibilities intact
- Improve names, remove duplication, reduce complexity
- Finish enforcement and directive sync before marking complete

### Parallel Opportunities
- Tasks marked [P] may run in parallel when they touch different files
- App, domain, and gateway/model implementation work can often proceed in parallel
- Architecture/directive updates can run in parallel with implementation

## Implementation Strategy
### MVP First (User Story 1 Only)
1. Complete Setup
2. Complete Foundational work
3. Complete User Story 1
4. Validate lint, relevant tests, and architecture/convention enforcement
5. Stop and review before expanding scope

### Incremental Delivery
1. Establish layer-correct foundations
2. Add User Story 1 and validate independently
3. Add User Story 2 and validate independently
4. Add User Story 3 and validate independently
5. Keep every increment constitution-compliant and cleaner than before
```

**Key Features**:
- **Phase-based organization**: Setup → Foundational → User Stories → Polish
- **User story grouping**: Each story has tests and implementation tasks
- **Parallel markers**: [P] indicates parallelizable tasks
- **Dependency tracking**: Clear phase and story dependencies
- **MVP strategy**: Guidance for incremental delivery

---

### constitution-template.md

**Purpose**: Template for project constitution documents

**Location**: `.specify/templates/constitution-template.md`

**Structure**:

```markdown
# [PROJECT_NAME] Constitution

## Core Principles

### [PRINCIPLE_1_NAME]
[PRINCIPLE_1_DESCRIPTION]

### [PRINCIPLE_2_NAME]
[PRINCIPLE_2_DESCRIPTION]

### [PRINCIPLE_3_NAME]
[PRINCIPLE_3_DESCRIPTION]

### [PRINCIPLE_4_NAME]
[PRINCIPLE_4_DESCRIPTION]

### [PRINCIPLE_5_NAME]
[PRINCIPLE_5_DESCRIPTION]

## [SECTION_2_NAME]
[SECTION_2_CONTENT]

## [SECTION_3_NAME]
[SECTION_3_CONTENT]

## Governance
[GOVERNANCE_RULES]

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
```

**Key Sections**:
- **Core Principles**: Non-negotiable project principles (5+ recommended)
- **Additional Sections**: Constraints, security, performance, workflow, etc.
- **Governance**: Amendment procedure, versioning, compliance review
- **Version Tracking**: Semantic versioning with dates

**Placeholders**:
- `[PROJECT_NAME]`: Project name
- `[PRINCIPLE_N_NAME]`: Principle names
- `[PRINCIPLE_N_DESCRIPTION]`: Principle descriptions
- `[SECTION_N_NAME]`: Additional section names
- `[SECTION_N_CONTENT]`: Section content
- `[GOVERNANCE_RULES]`: Governance rules
- `[CONSTITUTION_VERSION]`: Version (X.Y.Z)
- `[RATIFICATION_DATE]`: Original adoption date
- `[LAST_AMENDED_DATE]`: Last amendment date

---

### checklist-template.md

**Purpose**: Template for checklist documents

**Location**: `.specify/templates/checklist-template.md`

**Structure**:

```markdown
# [CHECKLIST TYPE] Checklist: [FEATURE NAME]

**Purpose**: [Brief description of what this checklist covers]
**Created**: [DATE]
**Feature**: [Link to spec.md or relevant documentation]

**Note**: This checklist is generated by the `/speckit-checklist` command

<!-- 
  IMPORTANT: The checklist items below are SAMPLE ITEMS for illustration only.
  The /speckit-checklist command MUST replace these with actual items
-->

## [Category 1]
- [ ] CHK001 First checklist item with clear action
- [ ] CHK002 Second checklist item
- [ ] CHK003 Third checklist item

## [Category 2]
- [ ] CHK004 Another category item
- [ ] CHK005 Item with specific criteria
- [ ] CHK006 Final item in this category

## Notes
- Check items off as completed: [x]
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
```

**Key Features**:
- **Purpose statement**: What the checklist covers
- **Feature link**: Reference to spec.md
- **Category organization**: Group items by quality dimension
- **CHK### numbering**: Sequential item IDs
- **Checkbox format**: `- [ ]` for unchecked, `- [x]` for checked

**Note**: The template contains sample items that must be replaced by the `/speckit-checklist` command.

---

## Extension System

### Overview

The extension system allows adding custom commands and hooks to the Spec Kit workflow. Extensions can provide additional commands and register hooks at specific points in the workflow.

### Extension Structure

```
.specify/extensions/
└── [extension-id]/
    ├── extension.yml          # Extension metadata
    ├── [config files]        # Extension-specific config
    ├── commands/              # Command definitions
    │   └── [command-name].md
    └── scripts/               # Implementation scripts
        ├── bash/
        │   └── [script-name].sh
        └── powershell/
            └── [script-name].ps1
```

### Extension Metadata (extension.yml)

```yaml
schema_version: "1.0"

extension:
  id: agent-context
  name: "Coding Agent Context"
  version: "1.0.0"
  description: "Manages coding agent context files"
  author: spec-kit-core
  repository: https://github.com/github/spec-kit
  license: MIT

requires:
  speckit_version: ">=0.2.0"

provides:
  commands:
    - name: speckit.agent-context.update
      file: commands/speckit.agent-context.update.md
      description: "Refresh the managed Spec Kit section"

hooks:
  after_specify:
    command: speckit.agent-context.update
    optional: true
    description: "Refresh agent context after specification"
  after_plan:
    command: speckit.agent-context.update
    optional: true
    description: "Refresh agent context after planning"

tags:
  - "agent"
  - "context"
  - "core"
```

**Fields**:
- `schema_version`: Extension schema version
- `extension.id`: Unique extension identifier
- `extension.name`: Human-readable name
- `extension.version`: Extension version
- `extension.description`: What the extension does
- `extension.author`: Extension author
- `extension.repository`: Source repository
- `extension.license`: License type
- `requires.speckit_version`: Minimum Spec Kit version
- `provides.commands`: Commands provided by extension
- `hooks`: Hook definitions (see Hook System section)
- `tags`: Extension tags for categorization

### Extension Configuration (extensions.yml)

```yaml
installed:
  - agent-context

settings:
  auto_execute_hooks: true

hooks:
  after_specify:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: true
      optional: true
      prompt: Execute speckit.agent-context.update?
      description: Refresh agent context after specification
      condition: null
  after_plan:
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: true
      optional: true
      prompt: Execute speckit.agent-context.update?
      description: Refresh agent context after planning
      condition: null
```

**Fields**:
- `installed`: List of installed extension IDs
- `settings.auto_execute_hooks`: Whether to auto-execute hooks
- `hooks.[hook_point]`: Hook configuration for each hook point

**Hook Properties**:
- `extension`: Extension providing the hook
- `command`: Command to execute
- `enabled`: true/false (default: true)
- `optional`: true/false (mandatory hooks auto-execute)
- `prompt`: User prompt for optional hooks
- `condition`: Conditional expression (evaluated by HookExecutor)

### Example Extension: agent-context

**Purpose**: Manages coding agent context files (AGENTS.md, CLAUDE.md, etc.)

**Configuration** (agent-context-config.yml):
```yaml
context_file: AGENTS.md
context_markers:
  start: <!-- SPECKIT START -->
  end: <!-- SPECKIT END -->
```

**Command**: `speckit.agent-context.update`
- Updates the managed section in the context file
- Points to the most recent plan.md
- Auto-detects plan path if not provided

**Hooks**:
- `after_specify`: Refresh context after specification
- `after_plan`: Refresh context after planning

---

## Hook System

### Overview

The hook system allows extensions to execute custom commands at specific points in the Spec Kit workflow. Hooks can be mandatory (auto-execute) or optional (prompt user).

### Hook Points

| Hook Point | Description |
|------------|-------------|
| `before_specify` | Before specification generation |
| `after_specify` | After specification generation |
| `before_clarify` | Before clarification |
| `after_clarify` | After clarification |
| `before_plan` | Before planning |
| `after_plan` | After planning |
| `before_tasks` | Before task generation |
| `after_tasks` | After task generation |
| `before_implement` | Before implementation |
| `after_implement` | After implementation |
| `before_analyze` | Before analysis |
| `after_analyze` | After analysis |
| `before_checklist` | Before checklist generation |
| `after_checklist` | After checklist generation |
| `before_constitution` | Before constitution update |
| `after_constitution` | After constitution update |

### Hook Execution Flow

1. **Check for extensions.yml**: Verify `.specify/extensions.yml` exists
2. **Filter by enabled status**: Skip hooks where `enabled: false`
3. **Evaluate conditions**: If `condition` field is non-empty, skip (leave to HookExecutor)
4. **Determine execution mode**:
   - **Mandatory hook** (`optional: false`): Emit `EXECUTE_COMMAND: {command}`
   - **Optional hook** (`optional: true`): Present to user with prompt
5. **Execute command**: Run the specified command
6. **Wait for result**: For mandatory hooks, wait before proceeding

### Hook Output Format

**Mandatory Hook**:
```markdown
## Extension Hooks

**Automatic Hook**: {extension}
Executing: `/{command}`
EXECUTE_COMMAND: {command}
```

**Optional Hook**:
```markdown
## Extension Hooks

**Optional Hook**: {extension}
Command: `/{command}`
Description: {description}

Prompt: {prompt}
To execute: `/{command}`
```

### Hook Configuration Example

```yaml
hooks:
  after_specify:
    - extension: git
      command: speckit.git.commit
      enabled: true
      optional: false
      prompt: null
      description: Commit specification
      condition: null
    - extension: agent-context
      command: speckit.agent-context.update
      enabled: true
      optional: true
      prompt: Execute speckit.agent-context.update?
      description: Refresh agent context after specification
      condition: null
```

### Best Practices

- **Mandatory hooks**: Use for critical operations that must always run
- **Optional hooks**: Use for operations that user might want to skip
- **Conditions**: Use conditional hooks for context-specific execution
- **Descriptions**: Provide clear descriptions for optional hooks
- **Prompts**: Use helpful prompts that explain what the hook does

---

## State Management

### Feature State (.specify/feature.json)

Tracks the active feature directory.

```json
{
  "feature_directory": "specs/003-user-auth"
}
```

**Purpose**: Allows downstream commands to locate the feature directory without relying on git branch name conventions.

**Usage**:
- Set by `/speckit-specify` after creating feature directory
- Read by scripts to determine active feature
- Can be overridden by `SPECIFY_FEATURE_DIRECTORY` environment variable

### Initialization Options (.specify/init-options.json)

Project initialization settings.

```json
{
  "branch_numbering": "sequential"
}
```

**Options**:
- `branch_numbering`: `"sequential"` or `"timestamp"`
  - `sequential`: Use NNN prefix (001, 002, 003...)
  - `timestamp`: Use YYYYMMDD-HHMMSS prefix

### Integration Configuration (.specify/integration.json)

Integration-specific settings.

```json
{
  "integration": "claude",
  "version": "0.8.5"
}
```

### Constitution State (.specify/memory/constitution.md)

Project governance principles and rules.

**Purpose**: Non-negotiable principles that all features must comply with.

**Usage**:
- Loaded by all skills for principle validation
- Checked during planning phase (Constitution Check)
- Updated via `/speckit-constitution` command
- Version tracked with semantic versioning

### Checklist State (checklists/*.md)

Quality validation checklists.

**Purpose**: Track validation status for various quality dimensions.

**Usage**:
- Generated by `/speckit-checklist` command
- Checked by `/speckit-implement` before execution
- Items marked as `[x]` when complete
- Can be multiple checklists (ux.md, security.md, etc.)

### Task State (tasks.md)

Implementation task list with completion status.

**Purpose**: Track implementation progress.

**Usage**:
- Generated by `/speckit-tasks` command
- Executed by `/speckit-implement` command
- Tasks marked as `[X]` when complete
- Organized by phase and user story

---

## Data Flow

### Specification Phase

```
User Input
    ↓
speckit-specify skill
    ↓
Pre-Execution Hooks (before_specify)
    ├─ Git extension: Create/switch branch
    └─ Other extensions
    ↓
Generate feature short name
    ↓
Create spec directory (specs/###-feature-name/)
    ↓
Copy spec-template.md → spec.md
    ↓
Fill spec with user stories, requirements, success criteria
    ↓
Spec Quality Validation
    ├─ Create checklists/requirements.md
    ├─ Validate against quality criteria
    └─ Resolve [NEEDS CLARIFICATION] markers
    ↓
Post-Execution Hooks (after_specify)
    └─ Agent context update (speckit.agent-context.update)
    ↓
Output: spec.md + checklists/requirements.md
```

### Clarification Phase

```
spec.md
    ↓
speckit-clarify skill
    ↓
Pre-Execution Hooks (before_clarify)
    ↓
Load spec.md and constitution.md
    ↓
Ambiguity Scan (10 categories)
    ↓
Generate prioritized questions (max 5)
    ↓
Interactive Questioning Loop
    ├─ Present question with options
    ├─ Wait for user response
    ├─ Integrate answer into spec.md
    └─ Save spec.md
    ↓
Re-validate Spec Quality Checklist
    ├─ Re-evaluate each checkbox
    ├─ Toggle [ ]/[x] markers
    └─ Report before/after pass counts
    ↓
Post-Execution Hooks (after_clarify)
    ↓
Output: Updated spec.md
```

### Planning Phase

```
spec.md
    ↓
speckit-plan skill
    ↓
Pre-Execution Hooks (before_plan)
    ↓
Run setup-plan.ps1
    ├─ Get feature paths
    └─ Copy plan-template.md → plan.md
    ↓
Load spec.md and constitution.md
    ↓
Phase 0: Research
    ├─ Extract NEEDS CLARIFICATION
    ├─ Generate research tasks
    └─ Consolidate findings → research.md
    ↓
Phase 1: Design & Contracts
    ├─ Extract entities → data-model.md
    ├─ Define interfaces → contracts/
    ├─ Create validation guide → quickstart.md
    └─ Update agent context (AGENTS.md)
    ↓
Re-evaluate Constitution Check
    ↓
Post-Execution Hooks (after_plan)
    └─ Agent context update (speckit.agent-context.update)
    ↓
Output: plan.md, research.md, data-model.md, contracts/, quickstart.md
```

### Task Generation Phase

```
spec.md + plan.md + design docs
    ↓
speckit-tasks skill
    ↓
Pre-Execution Hooks (before_tasks)
    ↓
Run setup-tasks.ps1
    ├─ Get feature paths
    └─ Resolve tasks-template.md
    ↓
Load design documents
    ├─ spec.md (user stories, priorities)
    ├─ plan.md (tech stack, structure)
    ├─ data-model.md (entities, relationships)
    ├─ contracts/ (interface specifications)
    ├─ research.md (technical decisions)
    └─ constitution.md (governance constraints)
    ↓
Generate task list
    ├─ Organize by user story
    ├─ Generate dependency graph
    ├─ Mark parallelizable tasks [P]
    └─ Validate task completeness
    ↓
Generate tasks.md
    ├─ Phase 1: Setup
    ├─ Phase 2: Foundational
    ├─ Phase 3+: User Stories (P1, P2, P3...)
    └─ Final Phase: Polish
    ↓
Post-Execution Hooks (after_tasks)
    ↓
Output: tasks.md with checklist format
```

### Implementation Phase

```
tasks.md + design docs
    ↓
speckit-implement skill
    ↓
Pre-Execution Hooks (before_implement)
    ↓
Run check-prerequisites.ps1
    ├─ Validate tasks.md exists
    └─ Get feature paths
    ↓
Check Checklist Status
    ├─ Scan all checklists in checklists/
    ├─ Count completed/incomplete items
    ├─ Create status table
    └─ Prompt user if incomplete
    ↓
Load Implementation Context
    ├─ tasks.md (task list)
    ├─ plan.md (tech stack, architecture)
    ├─ data-model.md (entities)
    ├─ contracts/ (interfaces)
    ├─ research.md (decisions)
    ├─ constitution.md (constraints)
    └─ quickstart.md (validation scenarios)
    ↓
Project Setup Verification
    ├─ Detect project type (git, Docker, ESLint, etc.)
    ├─ Create/verify ignore files
    └─ Append missing patterns
    ↓
Parse tasks.md
    ├─ Extract task phases
    ├─ Extract dependencies
    ├─ Extract task details
    └─ Extract execution flow
    ↓
Execute Implementation (Phase-by-Phase)
    ├─ Phase 1: Setup
    ├─ Phase 2: Foundational
    ├─ Phase 3+: User Stories
    └─ Final Phase: Polish
    ↓
Mark Completed Tasks [X]
    ↓
Post-Execution Hooks (after_implement)
    ↓
Output: Implemented code + updated tasks.md
```

### Analysis Phase

```
spec.md + plan.md + tasks.md
    ↓
speckit-analyze skill
    ↓
Pre-Execution Hooks (before_analyze)
    ↓
Run check-prerequisites.ps1
    ├─ Validate all artifacts exist
    └─ Get feature paths
    ↓
Load Artifacts (Progressive Disclosure)
    ├─ spec.md (requirements, success criteria, user stories)
    ├─ plan.md (architecture, phases, constraints)
    ├─ tasks.md (task IDs, phases, file paths)
    └─ constitution.md (principles, rules)
    ↓
Build Semantic Models
    ├─ Requirements inventory
    ├─ User story inventory
    ├─ Task coverage mapping
    └─ Constitution rule set
    ↓
Detection Passes (limit to 50 findings)
    ├─ Duplication detection
    ├─ Ambiguity detection
    ├─ Underspecification
    ├─ Constitution alignment
    ├─ Coverage gaps
    └─ Inconsistency
    ↓
Severity Assignment
    ├─ CRITICAL: Constitution violations, missing artifacts
    ├─ HIGH: Duplicate/conflicting requirements
    ├─ MEDIUM: Terminology drift, missing coverage
    └─ LOW: Style/wording improvements
    ↓
Produce Analysis Report
    ├─ Findings table
    ├─ Coverage summary
    ├─ Constitution issues
    ├─ Unmapped tasks
    └─ Metrics
    ↓
Provide Next Actions
    ├─ If CRITICAL: Recommend resolving before implementation
    ├─ If LOW/MEDIUM: Suggest improvements
    └─ Provide command suggestions
    ↓
Offer Remediation (user must approve)
    ↓
Post-Execution Hooks (after_analyze)
    ↓
Output: Analysis report (no file modifications)
```

---

## Best Practices

### Specification Writing

1. **Focus on WHAT and WHY, not HOW**
   - Describe user needs and business value
   - Avoid implementation details (frameworks, languages, APIs)
   - Write for business stakeholders, not developers

2. **Make Requirements Testable**
   - Each requirement should be verifiable
   - Use specific, measurable language
   - Avoid vague adjectives (fast, scalable, robust)

3. **Limit Clarifications**
   - Maximum 3 [NEEDS CLARIFICATION] markers
   - Prioritize by impact: scope > security/privacy > UX > technical
   - Use reasonable defaults for common patterns

4. **Define Success Criteria**
   - Must be measurable and technology-agnostic
   - Include both quantitative and qualitative measures
   - Focus on user/business outcomes

### Planning

1. **Respect Constitution**
   - Constitution is non-negotiable
   - All violations must be justified
   - Re-check after design phase

2. **Research First**
   - Resolve all NEEDS CLARIFICATION in Phase 0
   - Document decisions with rationale
   - Consider alternatives

3. **Design for Layered Architecture**
   - Policy/domain code independent of external details
   - Adapters handle translation between layers
   - Typed boundaries for all interfaces

### Task Generation

1. **Organize by User Story**
   - Each user story gets its own phase
   - Stories should be independently testable
   - Map all components to their story

2. **Mark Parallelizable Tasks**
   - Use [P] marker for tasks that can run in parallel
   - Different files, no dependencies
   - Enable parallel execution where possible

3. **Include Exact File Paths**
   - Every task must specify the file it changes
   - Avoid vague task descriptions
   - Enable clear execution tracking

### Implementation

1. **Phase-by-Phase Execution**
   - Complete each phase before moving to next
   - Respect task dependencies
   - Validate at each checkpoint

2. **Follow TDD Approach**
   - Write tests before implementation (if requested)
   - Tests → implementation → validation
   - Keep tests independent

3. **Mark Completed Tasks**
   - Mark tasks as [X] when complete
   - Track progress accurately
   - Enable resumption if interrupted

### Checklists

1. **Test Requirements, Not Implementation**
   - Checklists validate requirement quality
   - Focus on completeness, clarity, consistency
   - Avoid implementation verification

2. **Use Traceability References**
   - Reference spec sections [Spec §X.Y]
   - Use markers: [Gap], [Ambiguity], [Conflict]
   - Minimum 80% traceability

3. **Organize by Quality Dimension**
   - Completeness, Clarity, Consistency
   - Coverage, Measurability
   - Edge Cases, Dependencies

### Extensions

1. **Use Hooks Judiciously**
   - Mandatory hooks for critical operations
   - Optional hooks for user choice
   - Conditions for context-specific execution

2. **Provide Clear Descriptions**
   - Explain what the hook does
   - Use helpful prompts for optional hooks
   - Document expected behavior

3. **Handle Errors Gracefully**
   - Report errors clearly
   - Provide recovery suggestions
   - Don't break the workflow

---

## Troubleshooting

### Common Issues

#### Issue: "Feature directory not found"

**Cause**: Feature directory doesn't exist or feature.json is incorrect

**Solution**:
1. Run `/speckit-specify` to create feature directory
2. Check `.specify/feature.json` for correct path
3. Verify directory naming convention (###-feature-name)

#### Issue: "plan.md not found"

**Cause**: Implementation plan hasn't been created

**Solution**:
1. Run `/speckit-plan` to create plan.md
2. Verify feature directory exists
3. Check plan-template.md exists

#### Issue: "tasks.md not found"

**Cause**: Task list hasn't been generated

**Solution**:
1. Run `/speckit-tasks` to generate tasks.md
2. Verify plan.md and spec.md exist
3. Check tasks-template.md exists

#### Issue: "Template not found"

**Cause**: Template file missing or resolution failed

**Solution**:
1. Check `.specify/templates/` directory
2. Verify template file exists
3. Check extension templates if using overrides
4. Re-run `specify init` to restore core templates

#### Issue: "Branch name doesn't follow convention"

**Cause**: Git branch doesn't match expected pattern

**Solution**:
1. Rename branch to ###-feature-name format
2. Or use timestamp format if configured
3. Or set SPECIFY_FEATURE_DIRECTORY environment variable

#### Issue: "Checklist incomplete"

**Cause**: Quality checklists have unchecked items

**Solution**:
1. Review incomplete items in checklists/
2. Address missing requirements or clarifications
3. Mark items as complete if appropriate
4. Or proceed anyway if user approves

#### Issue: "Constitution check failed"

**Cause**: Design violates project principles

**Solution**:
1. Review constitution.md for violated principles
2. Justify violations in Complexity Tracking section
3. Or redesign to comply with constitution
4. Constitution is non-negotiable

#### Issue: "Hook execution failed"

**Cause**: Extension hook encountered an error

**Solution**:
1. Check extension logs for error details
2. Verify extension is properly configured
3. Check hook command exists and is executable
4. Disable hook in extensions.yml if needed

#### Issue: "Tasks not marked complete"

**Cause**: Implementation didn't mark tasks as [X]

**Solution**:
1. Manually mark completed tasks in tasks.md
2. Or re-run `/speckit-implement` to complete remaining tasks
3. Verify task descriptions match actual changes

### Debug Mode

To enable debug output, set environment variable:

```powershell
$env:SPECKIT_DEBUG = "true"
```

This will provide verbose output from PowerShell scripts and skills.

### Log Files

Check the following locations for logs:
- PowerShell script output (console)
- Extension logs (if extension provides logging)
- Agent context file (AGENTS.md) for context updates

### Getting Help

1. **Check documentation**: Review this wiki and skill SKILL.md files
2. **Run help commands**: Use `-Help` flag on PowerShell scripts
3. **Check templates**: Review template files for expected structure
4. **Verify configuration**: Check .specify/*.yml files
5. **Review examples**: Look at existing specs/ directories for examples

### Recovery Procedures

#### Recover from interrupted implementation

If `/speckit-implement` was interrupted:

1. Check tasks.md for completed tasks (marked [X])
2. Re-run `/speckit-implement` to continue from where it left off
3. Or manually complete remaining tasks

#### Recover from corrupted feature.json

If `.specify/feature.json` is corrupted:

1. Delete `.specify/feature.json`
2. Set `SPECIFY_FEATURE_DIRECTORY` environment variable
3. Or rename branch to match feature directory

#### Recover from missing templates

If templates are missing:

1. Re-run `specify init` to restore core templates
2. Or manually copy templates from another project
3. Check extension templates if using overrides

---

## Summary

Spec Kit (Speckit) is a comprehensive specification-driven development framework that provides:

- **Structured Workflow**: Clear phases from specification to implementation
- **Quality Gates**: Constitution compliance and validation at each step
- **Extensibility**: Hook system for custom automation
- **Layered Architecture**: Enforces clean separation of concerns
- **Incremental Delivery**: User stories organized by priority
- **AI-Assisted**: Skills guide developers through each phase

The system is built around:
- **Skills**: AI command definitions (speckit-specify, speckit-plan, etc.)
- **Scripts**: PowerShell utilities for path resolution and validation
- **Templates**: Document templates for consistent structure
- **Extensions**: Custom commands and hooks
- **State Management**: Feature tracking, constitution, checklists, tasks

By following the Spec Kit workflow, teams can ensure high-quality, constitution-compliant software with clear separation between business requirements and technical implementation.

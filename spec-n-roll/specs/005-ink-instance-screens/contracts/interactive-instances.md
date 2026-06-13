# Interactive Instance Screens Contract

Extends `specs/002-ink-interactive-cli/contracts/interactive-app.md` with instance-aware home screens, hub routes, quit confirmation, and navigation changes from feature 005.

## Instance Resolution at Launch

| Condition | Root route | Session `binaryContext` |
|-----------|------------|------------------------|
| Executed binary matches project-local launcher or `SPEC_N_ROLL_LOCAL_PIN=1` | `local-home` | `local` |
| Otherwise | `global-home` | `global` |

The interactive app MUST NOT render the legacy five-item `main-menu` as the root route after this feature.

## Global Home (`global-home`)

### Content area (always visible)

Rendered on every focus state, in order:

```
**Install Source:** Remote | Local ({absolute source path})
**Version:** v{semver} (global)
**Latest Version:** Up to date | v{semver} | Checking… | Unavailable
**Project:** {project root}
**Project Status:** Initialized | Not initialized
```

Blank lines between logical groups are not required unless specified; fields are consecutive labeled lines.

### Menu options

| Key | Label | Action | Disabled when |
|-----|-------|--------|---------------|
| 1 | Update Spec N' Roll | Local: build source + reload; Remote: `npm install -g` latest + reload | Remote AND latest is up to date |
| 2 | Init Project | Run init workflow in cwd | Never |
| 3 | Remove Spec N' Roll | Confirm → `runProjectRemove()` | Not initialized |
| 4 | Re-install Spec N' Roll | Confirm → remove then init | Not initialized |
| 5 | Quit | Double-press quit flow | Never |

## Local Home (`local-home`)

### Content area (always visible)

Block 1:

```
**Version:** v{semver} (local)
**Latest Version:** Up to date | v{semver} | Unavailable
**Project:** {project root}
```

Blank line, then Block 2 (when project metadata readable):

```
**Next task spec id:** {nextTaskSpecId}
**Updated at:** {HH:mm:ss YYYY-MM-DD from project metadata updatedAt}
```

When current task exists and implement is not complete, blank line then Block 3:

```
**Current task:** {id} {Title Cased Slug}
**Created at:** {from task-metadata.json}   // omitted if absent
**Implementation started at:** {from task-metadata.json}   // omitted if not started or complete
```

### Menu options

| Key | Label | Route / action | Disabled |
|-----|-------|----------------|----------|
| 1 | Project | `project-hub` | Never |
| 2 | Agents | `agents-list` | Never |
| 3 | Workflows | `workflows-list` | Never |
| 4 | Extensions | — | Always |
| 5 | Manage Spec N' Roll | `manage-local` | Never |
| 6 | Quit | Double-press quit | Never |

## Project Hub (`project-hub`)

### Content area

Minimum required fields:

- Most recent recognized task spec: `{id}-{slug}` and lifecycle status
- Count of specs per lifecycle status (e.g. Draft, Active, Complete, unknown)
- Total recognized spec count

Optional display enhancements (implementation discretion): last modified hint from workflow state or directory mtime.

### Menu options

| Key | Label | Route |
|-----|-------|-------|
| 1 | Specs | `specs-list` |
| 2 | Project Metadata | `project-metadata-view` |
| 3 | Back | `local-home` |

Screen title for `project-metadata-view` MUST be **Project Metadata** everywhere (navigation title, route fallback, breadcrumbs).

## Manage Local (`manage-local`)

### Content area (always visible)

```
**Version:** v{semver} (local)
**Latest Version:** Up to date | v{semver} | Unavailable
**Project:** {project root}
```

### Menu options

| Key | Label | Action | Disabled when |
|-----|-------|--------|---------------|
| 1 | Update Spec N' Roll | Copy global binary to local + reload | Local equals global version |
| 2 | Upgrade Project | `runUpdate()` full workflow | Never |
| 3 | Remove Spec N' Roll | Confirm → remove | Not initialized |
| 4 | Re-install Spec N' Roll | Confirm → remove + init | Not initialized |
| 5 | Back | `local-home` | Never |

## Navigation and Back

| Rule | Requirement |
|------|-------------|
| Non-home screens | Last selectable option MUST be **Back** returning to previous screen |
| Home screens (`global-home`, `local-home`) | Last option MUST be **Quit**, not Back |
| Global shortcuts | `b` and non-home `Esc` continue to pop one navigation level |
| Home `Esc` | Same as `q` → double-press quit confirmation |

Existing child routes (`specs-list`, `agents-list`, etc.) MUST gain a Back list item when they do not already expose one.

## Double-Press Quit

| Step | Behavior |
|------|----------|
| First `q` (any screen) | Show `Press q again to quit`; start 3s timer |
| Second `q` within 3s | Exit application |
| Any other key while pending | Cancel quit; restore prior UI |
| 3s elapse while pending | Cancel quit |
| `Esc` on home | Same as first `q` |
| `Esc` on non-home | Back navigation only; no quit prompt |

## Static vs Focus Content

Home and manage routes MUST NOT change the upper content area when menu focus moves. Focus-driven `SelectedOptionContext` applies to other list routes unchanged from feature 004.

## Task Metadata Contract

| Event | Write |
|-------|-------|
| Task spec directory created | `specs/{id}-{slug}/.spec-n-roll/task-metadata.json` → `{ createdAt }` |
| Implement slot claimed | Same file → `{ implementationStartedAt }` |
| Local home display | Read timestamps from task file; ignore project metadata copies |

See `contracts/task-metadata.schema.json` for schema.

## Build Marker Contract

| Artifact | Purpose |
|----------|---------|
| `dist/cli/.source-package-root` | Single-line absolute path to toolkit package root; written at build; excluded from npm `"files"` |

Presence at runtime ⇒ global install source Local; absence ⇒ Remote.

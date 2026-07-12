#!/usr/bin/env node

// src/presentation/cli/runtime-cli.ts
import { realpathSync } from "fs";
import { resolve as resolve3 } from "path";
import { fileURLToPath } from "url";
import { Logger as Logger2 } from "tslog";

// src/composition/runtime/runtime-composition-root.ts
import { AgentLister, SdkLoggerFactory } from "spec-n-roll-sdk";

// src/infrastructure/process/console-runtime-output-writer.ts
var ConsoleRuntimeOutputWriter = class {
  /**
   * Writes a line of text to stdout.
   *
   * @param text - Text to write without a trailing newline.
   */
  writeLine(text) {
    process.stdout.write(`${text}
`);
  }
};

// src/infrastructure/extensions/node-extension-discoverer.ts
import { readFile } from "fs/promises";
import { join } from "path";
import {
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME
} from "spec-n-roll-api";
var NodeExtensionDiscoverer = class {
  /**
   * Reads and validates the project's extension configuration without loading extensions.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   * @returns Validated extension configuration.
   */
  async discover(projectRoot) {
    const configurationPath = join(
      projectRoot,
      SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
      "extensions",
      "extensions.json"
    );
    const content = await readFile(configurationPath, "utf8");
    return this.parse(JSON.parse(content), configurationPath);
  }
  /**
   * Reads registered agent extension names and enabled state from configuration.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   * @returns Registered agent extensions and their enabled state.
   */
  async read(projectRoot) {
    const configuration = await this.discover(projectRoot);
    return Object.entries(configuration.agents).map(([name, entry]) => ({
      name,
      enabled: entry.enabled
    }));
  }
  /**
   * Validates the JSON shape used to control extension discovery.
   *
   * @param value - Parsed JSON document to validate.
   * @param configurationPath - Absolute file path included in validation errors.
   * @returns Validated extension configuration.
   */
  parse(value, configurationPath) {
    if (!this.isRecord(value) || !this.isRecord(value.agents)) {
      throw new Error(
        `Extension configuration at ${configurationPath} is invalid.`
      );
    }
    const agents = {};
    for (const [name, entry] of Object.entries(value.agents)) {
      if (!this.isRecord(entry) || typeof entry.enabled !== "boolean") {
        throw new Error(
          `Extension configuration at ${configurationPath} is invalid.`
        );
      }
      agents[name] = { enabled: entry.enabled };
    }
    return { agents };
  }
  /**
   * Determines whether a value is a non-array object record.
   *
   * @param value - Unknown value to inspect.
   * @returns true when the value is an object record.
   */
  isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
};

// src/infrastructure/ink/ink-runtime-ui-renderer.tsx
import { render } from "ink";

// src/presentation/ink/runtime-ui-app.tsx
import { useCallback as useCallback2, useEffect as useEffect3, useMemo as useMemo4, useState as useState5 } from "react";
import { Box as Box5, Text as Text5, useApp, useInput as useInput3 } from "ink";

// src/application/ui/terminal-layout-allocator.ts
var TerminalLayoutAllocator = class _TerminalLayoutAllocator {
  /** Fixed status bar height in rows. */
  static STATUS_ROWS = 3;
  /** Fixed key hint overlay height in rows. */
  static HINT_ROWS = 3;
  /** Smallest useful route content height in rows. */
  static MINIMUM_CONTENT_ROWS = 11;
  /**
   * Allocates terminal rows without allowing shell regions to overlap.
   *
   * @param terminalRows - Current stdout height; non-positive values are normalized.
   * @returns Stable shell region allocation and minimum-size state.
   */
  allocate(terminalRows) {
    const rows = Math.max(1, Math.floor(terminalRows));
    const minimumRows = _TerminalLayoutAllocator.STATUS_ROWS + _TerminalLayoutAllocator.HINT_ROWS + _TerminalLayoutAllocator.MINIMUM_CONTENT_ROWS;
    const requiresResize = rows < minimumRows;
    return {
      terminalRows: rows,
      statusRows: _TerminalLayoutAllocator.STATUS_ROWS,
      contentRows: requiresResize ? 0 : rows - _TerminalLayoutAllocator.STATUS_ROWS - _TerminalLayoutAllocator.HINT_ROWS,
      hintRows: _TerminalLayoutAllocator.HINT_ROWS,
      minimumRows,
      requiresResize
    };
  }
};

// src/presentation/ink/navigation-stack.ts
var NavigationStack = class {
  routes;
  /** @param home - Initial route that cannot be popped. */
  constructor(home) {
    this.routes = [home];
  }
  /** @returns Route currently displayed at the top of the stack. */
  current() {
    return this.routes.at(-1) ?? this.routes[0];
  }
  /** @param route - Non-home route to display. */
  push(route) {
    this.routes.push(route);
  }
  /** Removes one child route while preserving the home route. */
  pop() {
    if (this.routes.length > 1) this.routes.pop();
  }
  /** @returns True when navigation currently displays its root route. */
  isHome() {
    return this.routes.length === 1;
  }
};

// src/presentation/ink/layouts/app-scaffold.tsx
import { Box, Text } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
function AppScaffold(props) {
  return /* @__PURE__ */ jsxs(
    Box,
    {
      height: props.terminalRows,
      width: props.terminalColumns,
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsx(
          Box,
          {
            height: props.titleRows,
            flexShrink: 0,
            borderStyle: "single",
            paddingX: 1,
            children: /* @__PURE__ */ jsxs(Text, { bold: true, children: [
              "Spec N' Roll \xB7 ",
              props.title
            ] })
          }
        ),
        /* @__PURE__ */ jsx(Box, { height: props.routeLayoutRows, flexDirection: "column", children: props.routeLayout }),
        /* @__PURE__ */ jsx(
          Box,
          {
            height: props.hintRows,
            flexShrink: 0,
            borderStyle: "single",
            paddingX: 1,
            children: /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
              "Page Up/Down scroll",
              props.backEnabled ? " \xB7 Esc back" : ""
            ] })
          }
        )
      ]
    }
  );
}

// src/presentation/ink/route-screen.tsx
import { useCallback, useEffect, useMemo as useMemo3, useState as useState3 } from "react";
import { Text as Text4 } from "ink";

// src/presentation/ink/layouts/action-layout.tsx
import { Box as Box3 } from "ink";

// src/presentation/ink/menu-list.tsx
import { useMemo, useState } from "react";
import { Box as Box2, Text as Text2, useInput } from "ink";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function MenuList(props) {
  const enabled = useMemo(() => props.items.filter((item) => !item.disabled), [props.items]);
  const [selected, setSelected] = useState(0);
  const selectedItem = enabled[selected];
  useInput((_input, key) => {
    if (enabled.length === 0) return;
    if (key.upArrow) setSelected((value) => (value - 1 + enabled.length) % enabled.length);
    if (key.downArrow) setSelected((value) => (value + 1) % enabled.length);
    if (key.return && selectedItem != null) props.onSelect(selectedItem);
  });
  return /* @__PURE__ */ jsx2(Box2, { flexDirection: "column", children: props.items.map((item) => /* @__PURE__ */ jsxs2(Text2, { color: item.disabled ? "gray" : item === selectedItem ? "cyan" : void 0, children: [
    item === selectedItem ? "\u203A " : "  ",
    item.label,
    item.disabled ? " (disabled)" : ""
  ] }, item.id)) });
}

// src/presentation/ink/layouts/action-layout.tsx
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function ActionLayout(props) {
  const hasActions = props.actions.length > 0 && props.onActionSelect != null;
  const actionRows = hasActions ? props.actions.length + 1 : 0;
  const contentRows = Math.max(1, props.rows - actionRows);
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", height: props.rows, children: [
    /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", height: contentRows, paddingX: 2, children: props.content }),
    hasActions ? /* @__PURE__ */ jsxs3(Fragment, { children: [
      /* @__PURE__ */ jsx3(
        Box3,
        {
          borderStyle: "single",
          borderBottom: false,
          borderLeft: false,
          borderRight: false,
          height: 1,
          width: "100%"
        }
      ),
      /* @__PURE__ */ jsx3(MenuList, { items: props.actions, onSelect: props.onActionSelect })
    ] }) : null
  ] });
}

// src/presentation/ink/layouts/console-history.ts
var ConsoleHistory = class _ConsoleHistory {
  /**
   * Maximum number of transcript rows retained for display and scrolling.
   */
  static MAXIMUM_ROWS = 9999;
  /**
   * Appends output and discards the oldest rows beyond the retention limit.
   *
   * @param transcript - Existing console transcript, which may be empty.
   * @param output - New console output to append without interpretation.
   * @returns Transcript containing at most `MAXIMUM_ROWS` rows.
   */
  append(transcript, output) {
    return this.retain(`${transcript}${output}`);
  }
  /**
   * Returns the retained rows of a transcript in display order.
   *
   * @param transcript - Console transcript that may exceed the retention limit.
   * @returns At most `MAXIMUM_ROWS` rows, ordered from oldest to newest.
   */
  rows(transcript) {
    return this.retain(transcript).split(/\r?\n/);
  }
  /**
   * Discards transcript rows that precede the retention window.
   *
   * @param transcript - Console transcript that may exceed the retention limit.
   * @returns Transcript containing only the newest retained rows.
   */
  retain(transcript) {
    return transcript.split(/\r?\n/).slice(-_ConsoleHistory.MAXIMUM_ROWS).join("\n");
  }
};

// src/presentation/ink/layouts/console-layout.tsx
import { useMemo as useMemo2, useState as useState2 } from "react";
import { Box as Box4, Text as Text3, useInput as useInput2 } from "ink";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function ConsoleLayout(props) {
  const history = useMemo2(() => new ConsoleHistory(), []);
  const lines = history.rows(props.output);
  const pageSize = Math.max(1, props.rows);
  const [topLine, setTopLine] = useState2(Math.max(0, lines.length - pageSize));
  const [following, setFollowing] = useState2(true);
  const maximumTopLine = Math.max(0, lines.length - pageSize);
  const visibleTopLine = following ? maximumTopLine : Math.min(topLine, maximumTopLine);
  const visibleLines = lines.slice(visibleTopLine, visibleTopLine + pageSize);
  const scrollbar = new ConsoleScrollbar(
    pageSize,
    lines.length,
    visibleTopLine,
    maximumTopLine
  ).render();
  useInput2((_input, key) => {
    if (key.pageUp) {
      setFollowing(false);
      setTopLine(Math.max(0, visibleTopLine - pageSize));
    }
    if (key.pageDown) {
      const next = Math.min(maximumTopLine, visibleTopLine + pageSize);
      setFollowing(next === maximumTopLine);
      setTopLine(next);
    }
    if (key.end) {
      setFollowing(true);
      setTopLine(maximumTopLine);
    }
  });
  return /* @__PURE__ */ jsxs4(Box4, { height: props.rows, flexDirection: "row", children: [
    /* @__PURE__ */ jsx4(Box4, { height: props.rows, flexGrow: 1, paddingX: 2, children: /* @__PURE__ */ jsx4(Text3, { wrap: "wrap", children: visibleLines.join("\n") }) }),
    /* @__PURE__ */ jsx4(Box4, { height: props.rows, width: 1, flexShrink: 0, children: /* @__PURE__ */ jsx4(Text3, { children: scrollbar }) })
  ] });
}
var ConsoleScrollbar = class {
  /**
   * Creates one scrollbar for the currently visible transcript page.
   *
   * @param pageRows - Number of rows visible in the console viewport.
   * @param transcriptRows - Number of retained transcript rows.
   * @param topRow - First transcript row displayed in the viewport.
   * @param maximumTopRow - Largest valid first transcript row.
   */
  constructor(pageRows, transcriptRows, topRow, maximumTopRow) {
    this.pageRows = pageRows;
    this.transcriptRows = transcriptRows;
    this.topRow = topRow;
    this.maximumTopRow = maximumTopRow;
  }
  pageRows;
  transcriptRows;
  topRow;
  maximumTopRow;
  /**
   * Renders one scrollbar character for every console viewport row.
   *
   * @returns Newline-separated scrollbar track and thumb characters.
   */
  render() {
    const thumbRows = this.thumbRows();
    const thumbStartRow = this.thumbStartRow(thumbRows);
    return Array.from(
      { length: this.pageRows },
      (_, row) => row >= thumbStartRow && row < thumbStartRow + thumbRows ? "\u2588" : "\u2591"
    ).join("\n");
  }
  /**
   * Calculates the number of rows occupied by the scrollbar thumb.
   *
   * @returns Thumb height clamped to the console viewport.
   */
  thumbRows() {
    if (this.transcriptRows <= this.pageRows) return this.pageRows;
    return Math.max(
      1,
      Math.min(
        this.pageRows,
        Math.ceil(this.pageRows * this.pageRows / this.transcriptRows)
      )
    );
  }
  /**
   * Calculates the first viewport row occupied by the scrollbar thumb.
   *
   * @param thumbRows - Height of the scrollbar thumb in viewport rows.
   * @returns First thumb row within the scrollbar viewport.
   */
  thumbStartRow(thumbRows) {
    if (this.maximumTopRow === 0) return 0;
    return Math.round(
      this.topRow / this.maximumTopRow * (this.pageRows - thumbRows)
    );
  }
};

// src/presentation/ink/layouts/console-output-buffer.ts
var ConsoleOutputBuffer = class _ConsoleOutputBuffer {
  /**
   * Creates a buffer that delivers coalesced output through one callback.
   *
   * @param onFlush - Receives each non-empty batch of console output.
   */
  constructor(onFlush) {
    this.onFlush = onFlush;
  }
  onFlush;
  /**
   * Milliseconds to wait before publishing a group of console writes.
   */
  static FLUSH_INTERVAL_MS = 33;
  /** Pending output not yet delivered to the transcript owner. */
  pendingOutput = "";
  /** Scheduled flush that coalesces writes received during one interval. */
  timer;
  /**
   * Queues console output for the next visual transcript update.
   *
   * @param output - Console text to append. Empty text is ignored.
   */
  write(output) {
    if (output.length === 0) return;
    this.pendingOutput += output;
    if (this.timer != null) return;
    this.timer = setTimeout(
      () => this.flush(),
      _ConsoleOutputBuffer.FLUSH_INTERVAL_MS
    );
  }
  /**
   * Immediately delivers every queued write as one transcript update.
   */
  flush() {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = void 0;
    }
    if (this.pendingOutput.length === 0) return;
    const output = this.pendingOutput;
    this.pendingOutput = "";
    this.onFlush(output);
  }
  /**
   * Cancels a pending visual update and discards its undelivered output.
   */
  dispose() {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = void 0;
    this.pendingOutput = "";
  }
};

// src/presentation/ink/route-screen.tsx
import { Fragment as Fragment2, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function RouteScreen(props) {
  if (props.route === "agents") {
    return /* @__PURE__ */ jsx5(AgentsRoute, { rows: props.rows, listAgents: props.session.listAgents });
  }
  if (props.route === "manage") {
    return /* @__PURE__ */ jsx5(
      ManageRoute,
      {
        rows: props.rows,
        onNavigate: props.onNavigate,
        availability: props.session.projectUpdate
      }
    );
  }
  if (props.route === "global-update") {
    return /* @__PURE__ */ jsx5(
      GlobalUpdateRoute,
      {
        rows: props.rows,
        updateGlobalFramework: props.session.updateGlobalFramework,
        onRunningChange: props.onUpdateRunningChange
      }
    );
  }
  if (props.route === "project-update") {
    return /* @__PURE__ */ jsx5(
      ProjectUpdateRoute,
      {
        rows: props.rows,
        updateProjectFramework: props.session.updateProjectFramework,
        onRunningChange: props.onUpdateRunningChange
      }
    );
  }
  if (props.route === "init") {
    return /* @__PURE__ */ jsx5(
      InitRoute,
      {
        initializeProject: props.session.initializeProject,
        rows: props.rows
      }
    );
  }
  return /* @__PURE__ */ jsx5(
    HomeRoute,
    {
      onExitRequest: props.onExitRequest,
      onNavigate: props.onNavigate,
      rows: props.rows,
      session: props.session
    }
  );
}
function HomeRoute(props) {
  const [projectFound, setProjectFound] = useState3(props.session.projectFound);
  useEffect(() => {
    setProjectFound(props.session.projectExists());
  }, [props.session]);
  const initializationAction = props.session.mode === "global" ? [
    {
      id: "init",
      label: "Initialize Project",
      disabled: projectFound
    }
  ] : [];
  const actions = [
    ...initializationAction,
    ...props.session.mode === "local" ? [
      { id: "manage", label: "Manage Spec-N-Roll" },
      { id: "agents", label: "Agents" }
    ] : [],
    ...props.session.mode === "global" && projectFound ? [
      {
        id: "update-project",
        label: "Update Project Framework",
        disabled: !props.session.projectUpdate.enabled
      }
    ] : [],
    ...props.session.mode === "global" ? [
      {
        id: "update-global",
        label: "Update Global Framework",
        disabled: !props.session.globalUpdate.enabled
      }
    ] : [],
    { id: "exit", label: "Exit" }
  ];
  return /* @__PURE__ */ jsx5(
    ActionLayout,
    {
      actions,
      content: /* @__PURE__ */ jsx5(HomeContent, { session: props.session }),
      onActionSelect: (action) => {
        if (action.id === "init") props.onNavigate("init");
        if (action.id === "manage") props.onNavigate("manage");
        if (action.id === "update-project") props.onNavigate("project-update");
        if (action.id === "update-global") props.onNavigate("global-update");
        if (action.id === "agents") props.onNavigate("agents");
        if (action.id === "exit") props.onExitRequest();
      },
      rows: props.rows
    }
  );
}
function HomeContent(props) {
  const dispatcherSource = props.session.dispatcher.installSource === "local" ? "Local" : "Remote";
  const runtimeSource = props.session.runtime.projectLocal ? "Local" : "Global";
  return /* @__PURE__ */ jsxs5(Fragment2, { children: [
    /* @__PURE__ */ jsxs5(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { bold: true, color: "cyan", children: "Dispatcher:" }),
      " ",
      "(",
      dispatcherSource,
      ") ",
      props.session.dispatcher.installDirectory
    ] }),
    /* @__PURE__ */ jsxs5(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { bold: true, color: "cyan", children: "Version:" }),
      " ",
      props.session.dispatcher.packageVersion
    ] }),
    /* @__PURE__ */ jsx5(Text4, { children: " " }),
    /* @__PURE__ */ jsxs5(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { bold: true, color: "cyan", children: "Runtime:" }),
      " ",
      "(",
      runtimeSource,
      ") ",
      props.session.runtime.executablePath
    ] }),
    /* @__PURE__ */ jsxs5(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { bold: true, color: "cyan", children: "Version:" }),
      " ",
      props.session.runtime.packageVersion
    ] }),
    /* @__PURE__ */ jsxs5(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { bold: true, color: "cyan", children: "Working Directory:" }),
      " ",
      props.session.cwd
    ] }),
    /* @__PURE__ */ jsx5(Text4, { children: " " }),
    /* @__PURE__ */ jsxs5(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { bold: true, color: "cyan", children: "Project Root:" }),
      " ",
      props.session.projectRoot ?? "None"
    ] })
  ] });
}
function InitRoute(props) {
  const [result, setResult] = useState3("Initializing project\u2026");
  useEffect(() => {
    try {
      props.initializeProject();
      setResult("Project initialized successfully.");
    } catch (error) {
      setResult(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [props.initializeProject]);
  return /* @__PURE__ */ jsx5(
    ActionLayout,
    {
      actions: [],
      content: /* @__PURE__ */ jsx5(Text4, { children: result }),
      rows: props.rows
    }
  );
}
function AgentsRoute(props) {
  const [content, setContent] = useState3("Loading agents\u2026");
  useEffect(() => {
    props.listAgents().then(
      (agents) => setContent(
        agents.length === 0 ? "No agent extensions registered." : agents.map(
          (agent) => `${agent.name}  ${agent.enabled ? "enabled" : "disabled"}`
        ).join("\n")
      )
    ).catch(
      (error) => setContent(
        `Unable to list agents: ${error instanceof Error ? error.message : String(error)}`
      )
    );
  }, [props]);
  return /* @__PURE__ */ jsx5(
    ActionLayout,
    {
      actions: [],
      content: /* @__PURE__ */ jsx5(Text4, { children: content }),
      rows: props.rows
    }
  );
}
function ManageRoute(props) {
  const actions = [
    {
      id: "update-project",
      label: "Update Project Framework",
      disabled: !props.availability.enabled
    }
  ];
  return /* @__PURE__ */ jsx5(
    ActionLayout,
    {
      actions,
      content: /* @__PURE__ */ jsx5(Text4, { children: "Choose a framework maintenance action." }),
      onActionSelect: () => props.onNavigate("project-update"),
      rows: props.rows
    }
  );
}
function ProjectUpdateRoute(props) {
  const history = useMemo3(() => new ConsoleHistory(), []);
  const [output, setOutput] = useState3("Starting project framework update\u2026\n");
  const appendOutput = useCallback(
    (newOutput) => setOutput((currentOutput) => history.append(currentOutput, newOutput)),
    [history]
  );
  useEffect(() => {
    props.onRunningChange(true);
    try {
      props.updateProjectFramework();
      appendOutput("Project update completed.");
    } catch (error) {
      appendOutput(
        `Update failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      props.onRunningChange(false);
    }
    return () => props.onRunningChange(false);
  }, [appendOutput, props.onRunningChange, props.updateProjectFramework]);
  return /* @__PURE__ */ jsx5(ConsoleLayout, { rows: props.rows, output });
}
function GlobalUpdateRoute(props) {
  const history = useMemo3(() => new ConsoleHistory(), []);
  const [output, setOutput] = useState3("Starting global framework update\u2026\n");
  const appendOutput = useCallback(
    (newOutput) => setOutput((currentOutput) => history.append(currentOutput, newOutput)),
    [history]
  );
  const outputBuffer = useMemo3(
    () => new ConsoleOutputBuffer(appendOutput),
    [appendOutput]
  );
  useEffect(() => {
    props.onRunningChange(true);
    void props.updateGlobalFramework({
      write: (text) => outputBuffer.write(text)
    }).then(() => outputBuffer.write("\nUpdate completed. Reloading runtime\u2026")).catch(
      (error) => outputBuffer.write(
        `
Update failed: ${error instanceof Error ? error.message : String(error)}`
      )
    ).finally(() => {
      outputBuffer.flush();
      props.onRunningChange(false);
    });
    return () => {
      outputBuffer.dispose();
      props.onRunningChange(false);
    };
  }, [outputBuffer, props.onRunningChange, props.updateGlobalFramework]);
  return /* @__PURE__ */ jsx5(ConsoleLayout, { rows: props.rows, output });
}

// src/presentation/ink/use-stdout-size.ts
import { useEffect as useEffect2, useState as useState4 } from "react";
import { useStdout } from "ink";
function useStdoutSize() {
  const { stdout } = useStdout();
  const read = () => ({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
  const [size, setSize] = useState4(read);
  useEffect2(() => {
    const onResize = () => setSize(read());
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return size;
}

// src/presentation/ink/runtime-ui-app.tsx
import { Fragment as Fragment3, jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var EXIT_DIALOG_TIMEOUT_MS = 3e3;
function RuntimeUiApp(props) {
  const app = useApp();
  const size = useStdoutSize();
  const layout = useMemo4(
    () => new TerminalLayoutAllocator().allocate(size.rows),
    [size.rows]
  );
  const navigation = useMemo4(
    () => new NavigationStack(
      props.session.mode === "local" ? "local-home" : "global-home"
    ),
    [props.session.mode]
  );
  const [route, setRoute] = useState5(navigation.current());
  const routeTitle = route === "global-home" || route === "local-home" ? "Home" : route === "agents" ? "Agents" : route === "manage" ? "Manage Spec-N-Roll" : route === "global-update" ? "Update Global Framework" : route === "project-update" ? "Update Project Framework" : route;
  const [updateRunning, setUpdateRunning] = useState5(false);
  const [exitConfirmationKey, setExitConfirmationKey] = useState5();
  const requestExit = useCallback2(
    (confirmationKey) => setExitConfirmationKey(confirmationKey),
    []
  );
  useEffect3(() => {
    if (exitConfirmationKey == null) return;
    const timeout = setTimeout(
      () => setExitConfirmationKey(void 0),
      EXIT_DIALOG_TIMEOUT_MS
    );
    return () => clearTimeout(timeout);
  }, [exitConfirmationKey]);
  useInput3((_input, key) => {
    if (updateRunning) return;
    if (exitConfirmationKey === "escape" && key.escape) {
      app.exit();
      return;
    }
    if (exitConfirmationKey === "enter" && key.return) {
      app.exit();
      return;
    }
    if (exitConfirmationKey != null) return;
    if (!key.escape) return;
    if (navigation.isHome()) requestExit("escape");
    else {
      navigation.pop();
      setRoute(navigation.current());
    }
  });
  if (layout.requiresResize) {
    return /* @__PURE__ */ jsxs6(
      Box5,
      {
        height: layout.terminalRows,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        children: [
          /* @__PURE__ */ jsx6(Text5, { bold: true, color: "yellow", children: "Terminal is too small" }),
          /* @__PURE__ */ jsxs6(Text5, { children: [
            "Resize to at least ",
            layout.minimumRows,
            " rows."
          ] })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsx6(
    AppScaffold,
    {
      backEnabled: !navigation.isHome() && !updateRunning,
      hintRows: layout.hintRows,
      routeLayout: /* @__PURE__ */ jsxs6(Fragment3, { children: [
        /* @__PURE__ */ jsx6(
          RouteScreen,
          {
            route,
            rows: layout.contentRows,
            onNavigate: (next) => {
              navigation.push(next);
              setRoute(navigation.current());
            },
            onExitRequest: () => requestExit("enter"),
            onUpdateRunningChange: setUpdateRunning,
            session: props.session
          }
        ),
        exitConfirmationKey != null ? /* @__PURE__ */ jsx6(
          Box5,
          {
            position: "absolute",
            height: layout.contentRows,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            children: /* @__PURE__ */ jsx6(
              Box5,
              {
                borderStyle: "round",
                paddingX: 2,
                paddingY: 1,
                backgroundColor: "black",
                children: /* @__PURE__ */ jsxs6(Text5, { bold: true, color: "yellow", children: [
                  "Press ",
                  exitConfirmationKey,
                  " to exit"
                ] })
              }
            )
          }
        ) : null
      ] }),
      routeLayoutRows: layout.contentRows,
      terminalColumns: size.columns,
      terminalRows: layout.terminalRows,
      title: routeTitle,
      titleRows: layout.statusRows
    }
  );
}

// src/infrastructure/ink/ink-runtime-ui-renderer.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
var InkRuntimeUiRenderer = class {
  /**
   * Renders the interactive application and waits until it exits.
   *
   * @param session - Resolved mode, project state, and available commands.
   * @returns Promise fulfilled when Ink unmounts after user exit.
   */
  async render(session) {
    const instance = render(/* @__PURE__ */ jsx7(RuntimeUiApp, { session }));
    await instance.waitUntilExit();
    if (process.stdout.isTTY) process.stdout.write("\x1B[2J\x1B[H");
  }
};

// src/application/runtime/runtime-application.ts
import { Logger } from "tslog";

// src/application/ui/runtime-ui-mode-resolver.ts
var RuntimeUiModeResolver = class {
  /**
   * Resolves the initial UI mode from dispatcher-provided invocation context.
   *
   * @param invocation - Valid runtime invocation with preserved command arguments.
   * @returns Global for explicit global invocations or missing projects, otherwise local.
   */
  resolve(invocation) {
    return invocation.argv.includes("--global") || invocation.projectRoot == null ? "global" : "local";
  }
};

// src/application/init/init-command-resolver.ts
import { resolve } from "path";
var InitCommandResolver = class {
  /**
   * Resolves an init request from dispatcher-preserved arguments.
   *
   * @param argv - CLI arguments without the executable and script paths.
   * @param cwd - Working directory used when no root is supplied.
   * @param configuredRoot - Absolute dispatcher-resolved root for a root flag.
   * @returns Resolved request, or undefined when the invocation is not init.
   */
  resolve(argv, cwd, configuredRoot) {
    const initIndex = argv.indexOf("init");
    if (initIndex < 0) return void 0;
    const flaggedRoot = this.flagValue(argv, "--root");
    const positionalRoot = argv[initIndex + 1];
    if (flaggedRoot != null && configuredRoot != null) {
      return { projectRoot: configuredRoot };
    }
    const requestedRoot = flaggedRoot ?? (positionalRoot != null && !positionalRoot.startsWith("-") ? positionalRoot : ".");
    return { projectRoot: resolve(cwd, requestedRoot) };
  }
  /**
   * Reads a string option in either separated or equals form.
   *
   * @param argv - Full dispatcher-preserved argument list.
   * @param option - Long option name including its leading dashes.
   * @returns Supplied option value, otherwise undefined.
   */
  flagValue(argv, option) {
    const separatedIndex = argv.indexOf(option);
    if (separatedIndex >= 0) return argv[separatedIndex + 1];
    return argv.find((value) => value.startsWith(`${option}=`))?.slice(option.length + 1);
  }
};

// src/application/update/framework-update-availability-resolver.ts
var FrameworkUpdateAvailabilityResolver = class {
  /**
   * Resolves whether a project-local framework may be updated.
   *
   * @param dispatcherSource - Dispatcher installation source.
   * @param localVersion - Project-local runtime version.
   * @param dispatcherVersion - Dispatcher version providing the global framework.
   * @returns Availability and a disabled explanation when current.
   */
  project(dispatcherSource, localVersion, dispatcherVersion) {
    if (dispatcherSource === "local" || this.compare(localVersion, dispatcherVersion) < 0) return { enabled: true };
    return { enabled: false, disabledReason: "Project framework is current." };
  }
  /**
   * Compares semantic version numeric components.
   *
   * @param left - First version to compare.
   * @param right - Second version to compare.
   * @returns Positive when left is newer, zero when equal, negative when older.
   */
  compare(left, right) {
    const read = (value) => value.replace(/^v/, "").split("-")[0].split(".").map((part) => Number(part) || 0);
    const leftParts = read(left);
    const rightParts = read(right);
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
      const result = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
      if (result !== 0) return result;
    }
    return 0;
  }
};

// src/application/runtime/runtime-application.ts
var RuntimeApplication = class {
  /**
   * Creates a runtime application.
   *
   * @param reader - Input reader for dispatcher invocation JSON.
   * @param parser - Parser and validator for invocation payloads.
   * @param renderer - Interactive terminal UI presentation boundary.
   * @param projectInitializer - Project detection and local CLI installation boundary.
   * @param modeResolver - Resolver for global and local home selection.
   * @param initCommandResolver - Resolver for direct init command arguments.
   * @param logger - Logger used to report the invocation configuration received.
   */
  constructor(reader, parser, renderer, projectInitializer, modeResolver = new RuntimeUiModeResolver(), initCommandResolver = new InitCommandResolver(), agentLister, outputWriter, globalFrameworkUpdater, updateAvailabilityResolver = new FrameworkUpdateAvailabilityResolver(), runtimeReloader, logger = new Logger({
    name: "spec-n-roll-runtime",
    minLevel: 6
  })) {
    this.reader = reader;
    this.parser = parser;
    this.renderer = renderer;
    this.projectInitializer = projectInitializer;
    this.modeResolver = modeResolver;
    this.initCommandResolver = initCommandResolver;
    this.agentLister = agentLister;
    this.outputWriter = outputWriter;
    this.globalFrameworkUpdater = globalFrameworkUpdater;
    this.updateAvailabilityResolver = updateAvailabilityResolver;
    this.runtimeReloader = runtimeReloader;
    this.logger = logger;
  }
  reader;
  parser;
  renderer;
  projectInitializer;
  modeResolver;
  initCommandResolver;
  agentLister;
  outputWriter;
  globalFrameworkUpdater;
  updateAvailabilityResolver;
  runtimeReloader;
  logger;
  /**
   * Executes the runtime stub by printing the dispatcher invocation.
   */
  async run() {
    const invocation = this.parser.parse(this.reader.read());
    this.logger.debug("Received dispatcher invocation.", {
      argv: invocation.argv,
      cwd: invocation.cwd,
      projectRoot: invocation.projectRoot,
      dispatcherInstallSource: invocation.dispatcher.installSource
    });
    const initRequest = this.initCommandResolver.resolve(
      invocation.argv,
      invocation.cwd,
      invocation.projectRoot
    );
    if (initRequest != null) {
      this.logger.info("Initializing Spec-N-Roll project.", {
        projectRoot: initRequest.projectRoot
      });
      this.projectInitializer.initialize(initRequest.projectRoot);
      return;
    }
    if (invocation.argv[0] === "update") {
      await this.updateGlobalFramework(invocation, false, { write: (text) => this.outputWriter?.writeLine(text) });
      return;
    }
    if (invocation.argv[0] === "agents" && invocation.argv[1] === "list") {
      if (invocation.projectRoot == null || this.agentLister == null || this.outputWriter == null) {
        throw new Error("Agent listing requires a configured Spec-N-Roll project.");
      }
      const agents = await this.agentLister.list(invocation.projectRoot);
      this.logger.info("Writing agent extension list.", { agentCount: agents.length });
      this.outputWriter.writeLine("NAME	STATUS");
      for (const agent of agents) this.outputWriter.writeLine(agent.name + "	" + (agent.enabled ? "enabled" : "disabled"));
      return;
    }
    const projectOperationRoot = invocation.projectRoot ?? invocation.cwd;
    const projectFound = invocation.projectRoot != null && this.projectInitializer.projectExists(invocation.projectRoot);
    const mode = projectFound ? this.modeResolver.resolve(invocation) : "global";
    this.logger.debug("Launching interactive runtime UI.", {
      mode,
      projectRoot: invocation.projectRoot,
      projectFound
    });
    const projectUpdate = this.updateAvailabilityResolver.project(invocation.dispatcher.installSource, invocation.runtime.packageVersion, invocation.dispatcher.packageVersion);
    const globalUpdate = this.resolveGlobalUpdate(invocation);
    await this.renderer.render({
      mode,
      dispatcher: invocation.dispatcher,
      runtime: invocation.runtime,
      cwd: invocation.cwd,
      ...invocation.projectRoot == null ? {} : { projectRoot: invocation.projectRoot },
      projectFound,
      projectExists: () => this.projectInitializer.projectExists(projectOperationRoot),
      initializeProject: () => this.projectInitializer.initialize(projectOperationRoot),
      updateProjectFramework: () => this.projectInitializer.upgrade(projectOperationRoot),
      projectUpdate,
      updateGlobalFramework: async (output) => this.updateGlobalFramework(invocation, true, output),
      globalUpdate,
      listAgents: async () => {
        if (invocation.projectRoot == null || this.agentLister == null) throw new Error("Agent listing requires a configured Spec-N-Roll project.");
        return this.agentLister.list(invocation.projectRoot);
      }
    });
  }
  /**
   * Updates the global framework and optionally starts a refreshed runtime session.
   *
   * @param invocation - Dispatcher invocation that selected this runtime.
   * @param reload - True when an interactive session should be relaunched.
   */
  async updateGlobalFramework(invocation, reload, output) {
    if (this.globalFrameworkUpdater == null) throw new Error("Global framework updates are unavailable.");
    this.logger.info("Updating global Spec-N-Roll framework.", { installSource: invocation.dispatcher.installSource, installDirectory: invocation.dispatcher.installDirectory });
    await this.globalFrameworkUpdater.update(invocation.dispatcher.installSource, invocation.dispatcher.installDirectory, output);
    if (reload) this.runtimeReloader?.reload();
  }
  /**
   * Resolves whether the current global dispatcher source can be updated.
   *
   * @param invocation - Dispatcher invocation metadata for this runtime process.
   * @returns Global framework update availability.
   */
  resolveGlobalUpdate(invocation) {
    if (this.globalFrameworkUpdater == null) return { enabled: false, disabledReason: "Global updates are unavailable." };
    try {
      return this.globalFrameworkUpdater.isUpdateAvailable(invocation.dispatcher.installSource, invocation.dispatcher.packageVersion) ? { enabled: true } : { enabled: false, disabledReason: "Global framework is current." };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn("Unable to determine global framework update availability.", { message });
      return { enabled: false, disabledReason: "Unable to check npm for updates." };
    }
  }
};

// src/application/invocation/runtime-invocation-parser.ts
var RuntimeInvocationParser = class {
  /**
   * Parses a serialized dispatcher invocation.
   *
   * @param input - UTF-8 JSON text supplied by the dispatcher.
   * @returns Parsed runtime invocation.
   */
  parse(input) {
    if (input.trim() === "") {
      throw new Error("Runtime invocation payload was empty.");
    }
    const parsed = JSON.parse(input);
    if (!this.isRuntimeInvocation(parsed)) {
      throw new Error(
        "Runtime invocation payload did not match the dispatcher schema."
      );
    }
    return parsed;
  }
  /**
   * Checks whether an unknown value has the runtime invocation shape.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies the required invocation fields.
   */
  isRuntimeInvocation(value) {
    if (value == null || typeof value !== "object") {
      return false;
    }
    const candidate = value;
    return Array.isArray(candidate.argv) && candidate.argv.every((argument) => typeof argument === "string") && this.isDispatcherMetadata(candidate.dispatcher) && this.isRuntimeTarget(candidate.runtime) && typeof candidate.cwd === "string" && (candidate.projectRoot == null || typeof candidate.projectRoot === "string");
  }
  /**
   * Checks whether an unknown value has dispatcher metadata fields.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies dispatcher metadata fields.
   */
  isDispatcherMetadata(value) {
    if (value == null || typeof value !== "object") {
      return false;
    }
    const candidate = value;
    return (candidate.installSource === "remote" || candidate.installSource === "local") && typeof candidate.installDirectory === "string" && typeof candidate.packageVersion === "string";
  }
  /**
   * Checks whether an unknown value has selected runtime metadata fields.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies the required runtime fields.
   */
  isRuntimeTarget(value) {
    if (value == null || typeof value !== "object") {
      return false;
    }
    const candidate = value;
    return typeof candidate.executablePath === "string" && typeof candidate.packageVersion === "string" && typeof candidate.projectLocal === "boolean";
  }
};

// src/infrastructure/process/environment-runtime-invocation-reader.ts
import { RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE } from "spec-n-roll-api";
var EnvironmentRuntimeInvocationReader = class {
  /**
   * Reads the invocation value from the private child-process environment entry.
   *
   * @returns Invocation JSON or an empty string when the dispatcher did not provide it.
   */
  read() {
    return process.env[RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE] ?? "";
  }
};

// src/infrastructure/filesystem/node-project-initializer.ts
import { chmodSync, cpSync, existsSync as existsSync3, mkdirSync, readdirSync, readFileSync as readFileSync3, rmSync, writeFileSync as writeFileSync2 } from "fs";
import { createRequire } from "module";
import { dirname, join as join3 } from "path";
import { LOCAL_CLI_RELATIVE_PATH_SEGMENTS, LOCAL_FRAMEWORK_METADATA_RELATIVE_PATH_SEGMENTS, LOCAL_MCP_RELATIVE_PATH_SEGMENTS, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME as SPEC_N_ROLL_CONFIG_DIRECTORY_NAME3 } from "spec-n-roll-api";

// src/application/extensions/agents/codex-agent-extension-source.ts
var CodexAgentExtensionSource = class {
  /**
   * Returns the Codex extension module source.
   *
   * @returns ECMAScript module text for the Codex agent extension.
   */
  source() {
    return `/*
---
metadata:
  author: 'spec-n-roll'
  version: '0.1.0'
---
*/
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Installs Spec-N-Roll skills and MCP configuration for Codex.
 */
export default class CodexAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  /**
   * Creates Codex-native skill files for the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to write.
   * @returns A promise that resolves after all skill files are written.
   */
  async createSkills(skills) {
    for (const skill of skills) {
      const metadata = skill.metadata ?? CodexAgentExtension.defaultSkillMetadata;
      const skillPath = join(process.cwd(), '.codex', 'skills', skill.name, 'SKILL.md');
      const content = [
        '---',
        \`name: \${JSON.stringify(skill.name)}\`,
        \`description: \${JSON.stringify(skill.description)}\`,
        'metadata:',
        \`  author: \${JSON.stringify(metadata.author)}\`,
        \`  version: \${JSON.stringify(metadata.version)}\`,
        '---',
        '',
        ...skill.instructions.map((instruction) => instruction.content),
        '',
      ].join('\\n');
      await mkdir(dirname(skillPath), { recursive: true });
      await writeFile(skillPath, content, 'utf8');
    }
  }

  /**
   * Upserts the project-local Spec-N-Roll MCP server in Codex configuration.
   *
   * @returns A promise that resolves after the MCP configuration is written.
   */
  async configureMcp() {
    const configurationPath = join(process.cwd(), '.codex', 'mcp.json');
    const configuration = await CodexAgentExtension.readMcpConfiguration(configurationPath);
    await mkdir(dirname(configurationPath), { recursive: true });
    await writeFile(
      configurationPath,
      \`\${JSON.stringify({
        ...configuration,
        mcpServers: {
          ...configuration.mcpServers,
          'spec-n-roll': {
            command: 'node',
            args: ['./.spec-n-roll/cli/bin/spec-n-roll-mcp.js'],
          },
        },
      }, null, 2)}\\n\`,
      'utf8',
    );
  }

  /**
   * Reads the existing Codex MCP configuration or creates an empty server map.
   *
   * @param configurationPath - Absolute path to the Codex MCP configuration file.
   * @returns Parsed configuration with an MCP server map.
   */
  static async readMcpConfiguration(configurationPath) {
    try {
      const configuration = JSON.parse(await readFile(configurationPath, 'utf8'));
      return {
        ...configuration,
        mcpServers: configuration.mcpServers ?? {},
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { mcpServers: {} };
      throw error;
    }
  }
}
`;
  }
};

// src/application/extensions/agents/cursor-agent-extension-source.ts
var CursorAgentExtensionSource = class {
  /**
   * Returns the Cursor extension module source.
   *
   * @returns ECMAScript module text for the Cursor agent extension.
   */
  source() {
    return `/*
---
metadata:
  author: 'spec-n-roll'
  version: '0.1.0'
---
*/
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Installs Spec-N-Roll skills and MCP configuration for Cursor.
 */
export default class CursorAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  /**
   * Creates Cursor-native skill files for the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to write.
   * @returns A promise that resolves after all skill files are written.
   */
  async createSkills(skills) {
    for (const skill of skills) {
      const metadata = skill.metadata ?? CursorAgentExtension.defaultSkillMetadata;
      const skillPath = join(process.cwd(), '.cursor', 'skills', skill.name, 'SKILL.md');
      const content = [
        '---',
        \`name: \${JSON.stringify(skill.name)}\`,
        \`description: \${JSON.stringify(skill.description)}\`,
        'metadata:',
        \`  author: \${JSON.stringify(metadata.author)}\`,
        \`  version: \${JSON.stringify(metadata.version)}\`,
        '---',
        '',
        ...skill.instructions.map((instruction) => instruction.content),
        '',
      ].join('\\n');
      await mkdir(dirname(skillPath), { recursive: true });
      await writeFile(skillPath, content, 'utf8');
    }
  }

  /**
   * Upserts the project-local Spec-N-Roll MCP server in Cursor configuration.
   *
   * @returns A promise that resolves after the MCP configuration is written.
   */
  async configureMcp() {
    const configurationPath = join(process.cwd(), '.cursor', 'mcp.json');
    const configuration = await CursorAgentExtension.readMcpConfiguration(configurationPath);
    await mkdir(dirname(configurationPath), { recursive: true });
    await writeFile(
      configurationPath,
      \`\${JSON.stringify({
        ...configuration,
        mcpServers: {
          ...configuration.mcpServers,
          'spec-n-roll': {
            command: 'node',
            args: ['./.spec-n-roll/cli/bin/spec-n-roll-mcp.js'],
          },
        },
      }, null, 2)}\\n\`,
      'utf8',
    );
  }

  /**
   * Reads the existing Cursor MCP configuration or creates an empty server map.
   *
   * @param configurationPath - Absolute path to the Cursor MCP configuration file.
   * @returns Parsed configuration with an MCP server map.
   */
  static async readMcpConfiguration(configurationPath) {
    try {
      const configuration = JSON.parse(await readFile(configurationPath, 'utf8'));
      return {
        ...configuration,
        mcpServers: configuration.mcpServers ?? {},
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { mcpServers: {} };
      throw error;
    }
  }
}
`;
  }
};

// src/infrastructure/update/framework-extension-ownership.ts
import { existsSync, readFileSync } from "fs";
var FrameworkExtensionOwnership = class {
  /**
   * Checks the leading YAML frontmatter comment for framework authorship.
   *
   * @param filePath - Absolute extension file path to inspect.
   * @returns true when the file declares `metadata.author: spec-n-roll`.
   */
  isFrameworkOwned(filePath) {
    if (!existsSync(filePath)) return false;
    const source = readFileSync(filePath, "utf8");
    const match = source.match(/^\/\*\s*\r?\n---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n\*\//);
    return match != null && /metadata:\s*\r?\n\s*author:\s*['"]spec-n-roll['"]/.test(match[1]);
  }
};

// src/infrastructure/update/node-project-configuration-migrator.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync } from "fs";
import { join as join2 } from "path";
import { SPEC_N_ROLL_CONFIG_DIRECTORY_NAME as SPEC_N_ROLL_CONFIG_DIRECTORY_NAME2 } from "spec-n-roll-api";
var NodeProjectConfigurationMigrator = class {
  /**
   * Loads the existing extensions configuration and writes its canonical form.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   */
  migrate(projectRoot) {
    const configurationPath = join2(projectRoot, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME2, "extensions", "extensions.json");
    if (!existsSync2(configurationPath)) return;
    const parsed = this.parse(configurationPath);
    const agents = this.readAgents(parsed, configurationPath);
    writeFileSync(configurationPath, `${JSON.stringify({ ...parsed, agents }, null, 2)}
`, "utf8");
  }
  /**
   * Parses one configuration document with a path-specific error.
   *
   * @param configurationPath - Absolute configuration file path.
   * @returns Parsed JSON object.
   */
  parse(configurationPath) {
    try {
      const value = JSON.parse(readFileSync2(configurationPath, "utf8"));
      if (value == null || typeof value !== "object" || Array.isArray(value)) throw new Error("root must be an object");
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: ${message}`);
    }
  }
  /**
   * Validates legacy-compatible agent registrations while preserving extensions.
   *
   * @param configuration - Parsed configuration root.
   * @param configurationPath - Absolute configuration file path.
   * @returns Canonical agent registration map.
   */
  readAgents(configuration, configurationPath) {
    const agents = configuration.agents;
    if (agents == null) return {};
    if (typeof agents !== "object" || Array.isArray(agents)) throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: agents must be an object.`);
    return Object.fromEntries(Object.entries(agents).map(([name, entry]) => {
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: agent ${name} must be an object.`);
      const registration = entry;
      if (typeof registration.enabled !== "boolean") throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: agent ${name} enabled must be a boolean.`);
      return [name, registration];
    }));
  }
};

// src/infrastructure/filesystem/node-project-initializer.ts
var NodeProjectInitializer = class {
  /**
   * Creates a Node-backed project framework installer.
   *
   * @param runtimeBinaryPath - Absolute path to the running runtime binary to copy.
   * @param mcpBinaryPath - Absolute path to the bundled MCP server binary to copy.
   * @param codexAgentExtensionSource - Source provider for the bundled Codex extension module.
   * @param cursorAgentExtensionSource - Source provider for the bundled Cursor extension module.
   * @param ownership - Ownership reader for files in the extension directory.
   * @param migrator - Configuration migration boundary run after framework replacement.
   */
  constructor(runtimeBinaryPath = process.argv[1], mcpBinaryPath = createRequire(import.meta.url).resolve("spec-n-roll-mcp/dist/index.js"), codexAgentExtensionSource = new CodexAgentExtensionSource(), cursorAgentExtensionSource = new CursorAgentExtensionSource(), ownership = new FrameworkExtensionOwnership(), migrator = new NodeProjectConfigurationMigrator()) {
    this.runtimeBinaryPath = runtimeBinaryPath;
    this.mcpBinaryPath = mcpBinaryPath;
    this.codexAgentExtensionSource = codexAgentExtensionSource;
    this.cursorAgentExtensionSource = cursorAgentExtensionSource;
    this.ownership = ownership;
    this.migrator = migrator;
  }
  runtimeBinaryPath;
  mcpBinaryPath;
  codexAgentExtensionSource;
  cursorAgentExtensionSource;
  ownership;
  migrator;
  /**
   * Determines whether the project configuration directory exists.
   *
   * @param projectRoot - Absolute project root to inspect.
   * @returns true when `.spec-n-roll` exists.
   */
  projectExists(projectRoot) {
    return existsSync3(join3(projectRoot, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME3));
  }
  /**
   * Creates configuration storage and copies the current global framework files.
   *
   * @param projectRoot - Absolute project root receiving the installation.
   */
  initialize(projectRoot) {
    this.copyFrameworkFiles(projectRoot);
    this.writeDefaultExtensions(projectRoot, true);
  }
  /**
   * Replaces framework-owned files, preserves user extensions, and migrates configuration.
   *
   * @param projectRoot - Absolute existing project root receiving the update.
   */
  upgrade(projectRoot) {
    if (!this.projectExists(projectRoot)) throw new Error(`Cannot update Spec-N-Roll framework because ${projectRoot} is not initialized.`);
    this.copyFrameworkFiles(projectRoot);
    this.writeDefaultExtensions(projectRoot, false);
    this.migrator.migrate(projectRoot);
  }
  /**
   * Copies every framework-owned executable file into the local installation.
   *
   * @param projectRoot - Absolute project root receiving the framework files.
   */
  copyFrameworkFiles(projectRoot) {
    this.copyExecutable(this.runtimeBinaryPath, join3(projectRoot, ...LOCAL_CLI_RELATIVE_PATH_SEGMENTS));
    this.copyExecutable(this.mcpBinaryPath, join3(projectRoot, ...LOCAL_MCP_RELATIVE_PATH_SEGMENTS));
    writeFileSync2(join3(projectRoot, ...LOCAL_FRAMEWORK_METADATA_RELATIVE_PATH_SEGMENTS), JSON.stringify({ runtimeVersion: this.runtimeVersion() }, null, 2) + "\n", "utf8");
  }
  /**
   * Reads the package version associated with the current global runtime binary.
   *
   * @returns Non-empty runtime semantic version or `0.0.0` when unavailable.
   */
  runtimeVersion() {
    try {
      const packagePath = join3(dirname(this.runtimeBinaryPath), "..", "package.json");
      const packageJson = JSON.parse(readFileSync3(packagePath, "utf8"));
      return typeof packageJson.version === "string" && packageJson.version !== "" ? packageJson.version : "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
  /**
   * Copies one executable while preserving executable permissions on POSIX hosts.
   *
   * @param sourcePath - Absolute framework source file path.
   * @param targetPath - Absolute project target file path.
   */
  copyExecutable(sourcePath, targetPath) {
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath);
    if (process.platform !== "win32") chmodSync(targetPath, 493);
  }
  /**
   * Writes default extensions without replacing extension files owned by users.
   *
   * @param projectRoot - Absolute project root receiving extension files.
   * @param initializing - True when the project is newly initialized.
   */
  writeDefaultExtensions(projectRoot, initializing) {
    const extensionsRoot = join3(projectRoot, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME3, "extensions");
    const defaults = [["codex", this.codexAgentExtensionSource.source()], ["cursor", this.cursorAgentExtensionSource.source()]];
    for (const [name, source] of defaults) {
      const extensionPath = join3(extensionsRoot, "agents", name, "extension.mjs");
      mkdirSync(dirname(extensionPath), { recursive: true });
      if (initializing || !existsSync3(extensionPath) || this.ownership.isFrameworkOwned(extensionPath)) writeFileSync2(extensionPath, source, "utf8");
    }
    const configurationPath = join3(extensionsRoot, "extensions.json");
    if (initializing || !existsSync3(configurationPath)) writeFileSync2(configurationPath, JSON.stringify({ agents: { codex: { enabled: true }, cursor: { enabled: true } } }, null, 2) + "\n", "utf8");
    this.removeOwnedExtensionsAbsentFromDefaults(extensionsRoot, new Set(defaults.map(([name]) => name)));
  }
  /**
   * Removes only framework-owned default extension folders that the new framework no longer supplies.
   *
   * @param extensionsRoot - Absolute extension storage root.
   * @param defaultNames - Current framework-supplied agent extension names.
   */
  removeOwnedExtensionsAbsentFromDefaults(extensionsRoot, defaultNames) {
    const agentsRoot = join3(extensionsRoot, "agents");
    if (!existsSync3(agentsRoot)) return;
    for (const name of readdirSync(agentsRoot)) {
      if (defaultNames.has(name)) continue;
      const extensionPath = join3(agentsRoot, name, "extension.mjs");
      if (this.ownership.isFrameworkOwned(extensionPath)) rmSync(join3(agentsRoot, name), { recursive: true, force: true });
    }
  }
};

// src/infrastructure/update/node-global-framework-updater.ts
import { execFileSync, spawn } from "child_process";
import { readFileSync as readFileSync4 } from "fs";
import { join as join4, resolve as resolve2 } from "path";
var NodeGlobalFrameworkUpdater = class {
  /** Determines whether a global update is available. */
  isUpdateAvailable(installSource, installedVersion) {
    return installSource === "local" || this.compareVersions(this.latestVersion(), installedVersion) > 0;
  }
  /** Runs the selected update command while forwarding its output. */
  async update(installSource, installDirectory, output) {
    if (installSource === "local") {
      const sourceRoot = resolve2(readFileSync4(join4(installDirectory, "dist", ".source-package-root"), "utf8").trim(), "..", "..");
      await this.runNpm(["run", "build"], sourceRoot, output);
      return;
    }
    await this.runNpm(["install", "--global", "spec-n-roll@latest"], void 0, output);
  }
  /** Reads the latest published package version. */
  latestVersion() {
    return (this.runNpmSync(["view", "spec-n-roll", "version"], { encoding: "utf8" }) ?? "").trim();
  }
  /** Starts npm without taking control of the terminal. */
  runNpm(argumentsList, cwd, output) {
    const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
    const args = process.platform === "win32" ? ["/d", "/s", "/c", ["npm", ...argumentsList].join(" ")] : argumentsList;
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
      child.stdout.on("data", (chunk) => output.write(chunk.toString()));
      child.stderr.on("data", (chunk) => output.write(chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`npm exited with code ${code ?? "unknown"}.`)));
    });
  }
  /** Runs npm synchronously only for a short version lookup. */
  runNpmSync(argumentsList, options) {
    const output = process.platform === "win32" ? execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["npm", ...argumentsList].join(" ")], options) : execFileSync("npm", argumentsList, options);
    return output == null ? void 0 : output.toString();
  }
  /** Compares semantic version numeric components. */
  compareVersions(left, right) {
    const parse = (value) => value.replace(/^v/, "").split("-")[0].split(".").map((part) => Number(part) || 0);
    const leftParts = parse(left);
    const rightParts = parse(right);
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
      const result = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
      if (result !== 0) return result;
    }
    return 0;
  }
};

// src/infrastructure/update/node-runtime-reloader.ts
var NodeRuntimeReloader = class {
  /**
   * Exits with the dispatcher-owned reload code without opening another terminal.
   */
  reload() {
    process.exit(75);
  }
};

// src/composition/runtime/runtime-composition-root.ts
var RuntimeCompositionRoot = class {
  /**
   * Creates the default process-backed runtime application.
   *
   * @returns Runtime application wired to process stdin and stdout.
   */
  createApplication() {
    return new RuntimeApplication(
      new EnvironmentRuntimeInvocationReader(),
      new RuntimeInvocationParser(),
      new InkRuntimeUiRenderer(),
      new NodeProjectInitializer(),
      new RuntimeUiModeResolver(),
      new InitCommandResolver(),
      new AgentLister(new NodeExtensionDiscoverer(), new SdkLoggerFactory().create()),
      new ConsoleRuntimeOutputWriter(),
      new NodeGlobalFrameworkUpdater(),
      new FrameworkUpdateAvailabilityResolver(),
      new NodeRuntimeReloader()
    );
  }
};

// src/composition/runtime/runtime-program-factory.ts
import { Command } from "commander";
var RuntimeProgramFactory = class {
  /**
   * Creates the internal runtime command line program.
   *
   * @param application - Runtime application invoked by the command action.
   * @returns Commander program configured for the runtime executable.
   */
  create(application) {
    return new Command().name("spec-n-roll-runtime").description("Runs spec-n-roll runtime commands from dispatcher stdin.").version("0.1.0").allowUnknownOption(true).allowExcessArguments(true).action(async () => application.run());
  }
};

// src/presentation/cli/runtime-cli.ts
var RuntimeCli = class {
  /**
   * Creates runtime command-line wiring.
   *
   * @param compositionRoot - Factory for process-backed runtime dependencies.
   * @param programFactory - Factory for the Commander runtime program.
   * @param logger - Logger used to report fatal entrypoint errors.
   */
  constructor(compositionRoot = new RuntimeCompositionRoot(), programFactory = new RuntimeProgramFactory(), logger = new Logger2({
    name: "spec-n-roll-runtime",
    minLevel: 6
  })) {
    this.compositionRoot = compositionRoot;
    this.programFactory = programFactory;
    this.logger = logger;
  }
  compositionRoot;
  programFactory;
  logger;
  /**
   * Runs the internal runtime executable.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  async run(argv = process.argv) {
    await this.programFactory.create(this.compositionRoot.createApplication()).parseAsync([...argv]);
  }
  /**
   * Runs the CLI when the supplied module URL is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module that owns the check.
   * @param argv - Process argument vector including executable and script path.
   */
  async runIfMain(moduleUrl, argv = process.argv) {
    if (!this.isMainModule(moduleUrl, argv)) {
      return;
    }
    try {
      await this.run(argv);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(message);
      process.exitCode = 1;
    }
  }
  /**
   * Checks whether a module is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module to inspect.
   * @param argv - Process argument vector including executable and script path.
   * @returns true when the module path matches the process script path.
   */
  isMainModule(moduleUrl, argv = process.argv) {
    if (argv[1] == null) {
      return false;
    }
    try {
      return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(resolve3(argv[1]));
    } catch {
      return false;
    }
  }
};

// src/index.ts
await new RuntimeCli().runIfMain(import.meta.url);
export {
  ConsoleRuntimeOutputWriter,
  EnvironmentRuntimeInvocationReader,
  InitCommandResolver,
  NodeExtensionDiscoverer,
  NodeProjectInitializer,
  RuntimeApplication,
  RuntimeCli,
  RuntimeCompositionRoot,
  RuntimeInvocationParser,
  RuntimeProgramFactory,
  RuntimeUiModeResolver,
  TerminalLayoutAllocator
};
//# sourceMappingURL=index.js.map